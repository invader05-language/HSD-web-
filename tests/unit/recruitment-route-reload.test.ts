import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ApplicationsPage from "../../app/pages/admin/recruitment/batches/[batchId]/applications.vue";
import ApplicationDetailPage from "../../app/pages/admin/recruitment/batches/[batchId]/applications/[id].vue";
import RecruitmentAssessmentWorkbench from "../../app/components/admin/RecruitmentAssessmentWorkbench.vue";
import RecruitmentPublicationWorkbench from "../../app/components/admin/RecruitmentPublicationWorkbench.vue";

const routeState = reactive({
  params: { batchId: "batch-a", id: undefined as string | undefined },
  query: {},
});
enableAutoUnmount(afterEach);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function apiBatch(id: string, name: string) {
  return {
    id,
    name,
    startAt: "2026-08-01T00:00:00.000Z",
    endAt: "2026-09-30T00:00:00.000Z",
    timezone: "Asia/Shanghai",
    lifecycleStatus: "PUBLISHED",
    manualOverride: "NONE",
    effectiveStatus: "open",
    effectiveStatusReason: "within-window",
    version: 1,
    publishedAt: "2026-07-31T00:00:00.000Z",
    actualOpenedAt: "2026-08-01T00:00:00.000Z",
    closedAt: null,
    archivedAt: null,
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    applicationCount: 1,
    openCenters: [],
    responsibleAccounts: [],
  };
}

function apiApplication(batchId: string, id: string, name: string) {
  return {
    id,
    batchId,
    contact: `${name}@example.test`,
    baizeDirection: null,
    acceptsAdjustment: true,
    status: "SUBMITTED",
    version: 1,
    batchNameSnapshot: batchId,
    batchVersionAtSubmission: 1,
    applicantProfileSnapshot: {
      name,
      studentId: `${id}-student`,
      grade: "大二",
      className: "软件工程 1 班",
      contact: `${name}@example.test`,
    },
    submittedAt: "2026-08-10T01:00:00.000Z",
    withdrawnAt: null,
    preferences: [],
  };
}

function assessmentBatch(batchId: string, name: string) {
  return {
    batch: { id: batchId, name: `${name} 批次`, lifecycleStatus: "open" },
    currentRound: 1,
    status: "ASSESSING",
    version: 1,
    publishedAt: null,
    pending: 1,
    adjustmentPending: 0,
    canAdvance: false,
    advanceBlocker: { code: "ASSESSMENT_BATCH_NOT_CLOSED", count: 0 },
    nextAction: "CLOSE_BATCH",
    items: [{
      applicationId: `${batchId}-application`,
      person: {
        id: `${batchId}-person`,
        name,
        studentId: `${batchId}-student`,
        grade: "2026",
        className: "软件一班",
      },
      acceptsAdjustment: true,
      baizeDirection: null,
      preferences: [{
        rank: "FIRST",
        center: { id: "media", slug: "media", name: "新媒体中心" },
      }],
      roundResults: [],
      adjustmentProposal: null,
      adjustmentDecision: null,
      finalResult: null,
    }],
  };
}

const headingStub = {
  props: ["title", "description"],
  template: "<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name='actions' /></header>",
};
const linkStub = { props: ["to"], template: "<a><slot /></a>" };

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  routeState.params.batchId = "batch-a";
  routeState.params.id = undefined;
  vi.stubGlobal("computed", computed);
  vi.stubGlobal("reactive", reactive);
  vi.stubGlobal("ref", ref);
  vi.stubGlobal("watch", watch);
  vi.stubGlobal("nextTick", nextTick);
  vi.stubGlobal("onMounted", onMounted);
  vi.stubGlobal("onBeforeUnmount", onBeforeUnmount);
  vi.stubGlobal("definePageMeta", vi.fn());
  vi.stubGlobal("useHead", vi.fn());
  vi.stubGlobal("useRoute", () => routeState);
  vi.stubGlobal("useRuntimeConfig", () => ({
    public: { apiBase: "https://api.example.test", useMockApi: false },
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("production recruitment route reuse", () => {
  it("reloads a reused roster for the new batch and ignores the late old response", async () => {
    const lateBatchA = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v1/admin/recruitment/batches/batch-a") return lateBatchA.promise;
      if (url.pathname === "/api/v1/admin/recruitment/batches/batch-b") {
        return new Response(JSON.stringify(apiBatch("batch-b", "Batch B roster")), { status: 200 });
      }
      if (url.pathname === "/api/v1/admin/recruitment/batches/batch-b/applications") {
        return new Response(JSON.stringify({
          page: 1,
          pageSize: 20,
          total: 1,
          items: [apiApplication("batch-b", "application-b", "Candidate B")],
        }), { status: 200 });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }));

    const wrapper = mount(ApplicationsPage, { global: { stubs: {
      AdminPageHeading: headingStub,
      NuxtLink: linkStub,
      NuxtPage: true,
      PaginationControls: true,
    } } });
    await nextTick();

    routeState.params.batchId = "batch-b";
    await nextTick();
    await flushPromises();
    expect(wrapper.text()).toContain("Batch B roster");
    expect(wrapper.text()).toContain("Candidate B");

    lateBatchA.resolve(new Response(JSON.stringify(apiBatch("batch-a", "Late Batch A")), { status: 200 }));
    await flushPromises();
    expect(wrapper.text()).toContain("Batch B roster");
    expect(wrapper.text()).not.toContain("Late Batch A");
  });

  it("reloads a reused application detail and ignores the late old record", async () => {
    routeState.params.id = "application-a";
    const lateApplicationA = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname.endsWith("/batch-a/applications/application-a")) return lateApplicationA.promise;
      if (pathname.endsWith("/batch-b/applications/application-b")) {
        return new Response(JSON.stringify(apiApplication("batch-b", "application-b", "Detail B")), { status: 200 });
      }
      throw new Error(`Unexpected request: ${pathname}`);
    }));

    const wrapper = mount(ApplicationDetailPage, { global: { stubs: {
      AdminPageHeading: headingStub,
      NuxtLink: linkStub,
    } } });
    await nextTick();

    routeState.params.batchId = "batch-b";
    routeState.params.id = "application-b";
    await nextTick();
    await flushPromises();
    expect(wrapper.text()).toContain("Detail B");

    lateApplicationA.resolve(new Response(JSON.stringify(
      apiApplication("batch-a", "application-a", "Late Detail A"),
    ), { status: 200 }));
    await flushPromises();
    expect(wrapper.text()).toContain("Detail B");
    expect(wrapper.text()).not.toContain("Late Detail A");
  });

  it.each([
    ["assessment", RecruitmentAssessmentWorkbench],
    ["publication", RecruitmentPublicationWorkbench],
  ])("reloads the %s workbench when its batch prop changes", async (_label, component) => {
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname.endsWith("/adjustment-targets")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }
      if (pathname.endsWith("/batch-a/assessments")) {
        return new Response(JSON.stringify(assessmentBatch("batch-a", "Candidate A")), { status: 200 });
      }
      if (pathname.endsWith("/batch-b/assessments")) {
        return new Response(JSON.stringify(assessmentBatch("batch-b", "Candidate B")), { status: 200 });
      }
      throw new Error(`Unexpected request: ${pathname}`);
    }));

    const wrapper = mount(component, {
      props: { batchId: "batch-a" },
      global: { stubs: {
        AdminPageHeading: headingStub,
        AdminStatusPill: true,
        NuxtLink: linkStub,
      } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Candidate A");

    await wrapper.setProps({ batchId: "batch-b" });
    await flushPromises();
    expect(wrapper.text()).toContain("Candidate B");
    expect(wrapper.text()).not.toContain("Candidate A");
  });
});
