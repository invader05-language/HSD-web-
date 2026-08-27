import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import BatchDetailPage from "../../app/pages/admin/recruitment/batches/[batchId].vue";
import RecruitmentAssessmentWorkbench from "../../app/components/admin/RecruitmentAssessmentWorkbench.vue";
import RecruitmentPublicationWorkbench from "../../app/components/admin/RecruitmentPublicationWorkbench.vue";
import { createProductionRecruitmentBatchController } from "../../app/composables/useProductionRecruitmentBatch";
import { useSessionStore } from "../../app/stores/session";
import { getRecruitmentAssessmentMessage } from "../../app/utils/recruitment-assessment-messages";

const root = resolve(__dirname, "../..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

const routeState = reactive({
  params: { batchId: "batch-p0" },
  path: "/admin/recruitment/batches/batch-p0",
});

const baseBatch = {
  id: "batch-p0",
  name: "P0 API 招新",
  startAt: "2026-08-01T00:00:00.000Z",
  endAt: "2026-09-30T00:00:00.000Z",
  timezone: "Asia/Shanghai",
  lifecycleStatus: "PUBLISHED",
  manualOverride: "NONE",
  effectiveStatus: "open",
  effectiveStatusReason: "within-window",
  version: 3,
  publishedAt: "2026-07-31T00:00:00.000Z",
  actualOpenedAt: "2026-08-01T00:00:00.000Z",
  closedAt: null,
  archivedAt: null,
  createdAt: "2026-07-30T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  applicationCount: 0,
  openCenters: [],
  responsibleAccounts: [{
    id: "account-owner",
    username: "owner",
    status: "ENABLED",
    adminLevel: "OWNER",
    person: { id: "person-owner", name: "联盟总负责人" },
  }],
};

const lifecycle = {
  page: 1,
  pageSize: 50,
  total: 1,
  items: [{
    id: "event-long-id",
    action: "recruitment.batch.paused",
    actor: {
      type: "account",
      accountId: "account-owner",
      username: "owner",
      displayName: "联盟总负责人",
    },
    target: { type: "RecruitmentBatch", id: "batch-p0" },
    before: { lifecycleStatus: "PUBLISHED", manualOverride: "NONE", version: 3 },
    after: { lifecycleStatus: "PUBLISHED", manualOverride: "PAUSED", version: 4 },
    reason: null,
    createdAt: "2026-08-08T00:00:00.000Z",
  }],
};

const headingStub = {
  props: ["title", "description"],
  template: "<header><h1>{{ title }}</h1><p>{{ description }}</p><slot name='actions' /></header>",
};
const linkStub = { props: ["to"], template: "<a><slot /></a>" };

function installOwnerSession() {
  useSessionStore().applyApiSession({
    account: {
      id: "account-owner",
      adminLevel: "OWNER",
      adminCenterId: null,
      capabilities: ["recruitment.batch.manage", "recruitment.assessment.edit"],
    },
    person: { id: "person-owner", name: "联盟总负责人", status: "FORMAL_MEMBER" },
    mustChangePassword: false,
  });
}

function installVueGlobals() {
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
}

function assessmentResponse(currentRound = 1, version = 3) {
  return {
    batch: { id: "batch-p0", name: "P0 API 招新", lifecycleStatus: "open" },
    currentRound,
    status: "ASSESSING",
    version,
    publishedAt: null,
    pending: 0,
    adjustmentPending: 0,
    canAdvance: false,
    advanceBlocker: { code: "ASSESSMENT_BATCH_NOT_CLOSED", count: 0 },
    nextAction: "CLOSE_BATCH",
    items: [],
  };
}

describe("Task 2 recruitment P0 regressions", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    routeState.params.batchId = "batch-p0";
    routeState.path = "/admin/recruitment/batches/batch-p0";
    installVueGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a lifecycle command whose action does not match the authoritative status", async () => {
    const runAdminBatchCommand = vi.fn();
    const controller = createProductionRecruitmentBatchController({
      getAdminBatch: vi.fn().mockResolvedValue(baseBatch),
      listAdminBatchLifecycleEvents: vi.fn().mockResolvedValue({ page: 1, pageSize: 50, total: 0, items: [] }),
      runAdminBatchCommand,
    });

    await controller.load("batch-p0");
    await expect(controller.runCommand("resume")).resolves.toBe(false);
    expect(runAdminBatchCommand).not.toHaveBeenCalled();
    expect(controller.commandError.value).toContain("暂停");
  });

  it("maps a real command permission failure to visible Chinese copy", async () => {
    const controller = createProductionRecruitmentBatchController({
      getAdminBatch: vi.fn().mockResolvedValue(baseBatch),
      listAdminBatchLifecycleEvents: vi.fn().mockResolvedValue({ page: 1, pageSize: 50, total: 0, items: [] }),
      runAdminBatchCommand: vi.fn().mockRejectedValue(Object.assign(new Error("Owner only"), {
        status: 403,
        code: "OWNER_ONLY",
      })),
    });

    await controller.load("batch-p0");
    await expect(controller.runCommand("pause")).resolves.toBe(false);
    expect(controller.commandError.value).toContain("权限");
  });

  it("disables assessment advance for an open production batch and explains that closing is required", async () => {
    installOwnerSession();
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/adjustment-targets")) return new Response(JSON.stringify({ items: [] }), { status: 200 });
      if (url.endsWith("/assessments")) return new Response(JSON.stringify(assessmentResponse()), { status: 200 });
      return new Response(JSON.stringify(baseBatch), { status: 200 });
    }));

    const wrapper = mount(RecruitmentAssessmentWorkbench, {
      props: { batchId: "batch-p0" },
      global: { stubs: {
        NuxtLink: linkStub,
      } },
    });
    await flushPromises();
    await nextTick();

    const advance = wrapper.findAll("button").find((button) => button.text().includes("推进"));
    expect(advance).toBeDefined();
    expect(advance!.attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("关闭报名后才能推进");
    expect(wrapper.text()).not.toContain("Batch Assessment");
    expect(wrapper.text()).not.toContain("Candidate Roster");
    expect(wrapper.text()).not.toContain("batchId：");
    expect(wrapper.text()).not.toContain("真实后端接入后");
    expect(wrapper.text()).not.toContain("负责人建议后由总负责人确认");
    expect(wrapper.text()).not.toContain("GROUP BY FIRST CHOICE");
    expect(wrapper.find(".admin-assessment-workflow-summary").exists()).toBe(false);
    expect(wrapper.find(".admin-sync-preview").exists()).toBe(false);
  });

  it("maps final adjustment API errors to business-facing Chinese messages", () => {
    expect(getRecruitmentAssessmentMessage({ code: "ADJUSTMENT_NOT_ALLOWED" })).toContain("不符合最终调剂条件");
    expect(getRecruitmentAssessmentMessage({ code: "ADJUSTMENT_TARGET_FORBIDDEN" })).toContain("不能将成员调剂至该中心");
    expect(getRecruitmentAssessmentMessage({ code: "ADJUSTMENT_DECISION_ALREADY_EXISTS" })).toContain("已经存在最终处理结果");
    expect(getRecruitmentAssessmentMessage({ code: "OWNER_PERMISSION_REQUIRED" })).toContain("无权提交最终调剂结果");
  });

  it("keeps publication workbench copy business-facing and avoids exposing raw API errors", () => {
    const source = read("app/components/admin/RecruitmentPublicationWorkbench.vue");

    expect(source).toContain("整批发布复核");
    expect(source).toContain("结果发布确认");
    expect(source).not.toContain("Publication Review");
    expect(source).not.toContain("Publish Recruitment Results");
    expect(source).not.toContain("服务器请求失败（{{ apiError }}）");
    expect(source).not.toMatch(/reason instanceof Error \? `(?:加载|发布)失败（\$\{reason\.message\}）`/);
    expect(source).toContain("getRecruitmentAssessmentMessage");
    expect(RecruitmentPublicationWorkbench).toBeDefined();
  });

  it("keeps the mobile assessment selector rule syntactically valid after removing retired copy", () => {
    const css = read("app/assets/css/main.css");

    expect(css).toMatch(/\.admin-preference-list,\s*\.admin-rounds\s*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(css).not.toMatch(/\.admin-rounds,\s*\.admin-drawer__footer\s*>\s*span\s*\{/s);
  });

  it("does not render a reason textarea for pause confirmation and keeps confirmation enabled", async () => {
    installOwnerSession();
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/lifecycle-events")) return new Response(JSON.stringify({ ...lifecycle, total: 0, items: [] }), { status: 200 });
      return new Response(JSON.stringify(baseBatch), { status: 200 });
    }));

    const wrapper = mount(BatchDetailPage, { global: {
      stubs: {
        AdminPageHeading: headingStub,
        AdminStatusPill: true,
        PaginationControls: true,
        NuxtPage: true,
        NuxtLink: linkStub,
      },
    } });
    await flushPromises();
    await nextTick();
    await wrapper.findAll("button").find((button) => button.text() === "暂停报名")!.trigger("click");

    const dialog = wrapper.get('[role="alertdialog"]');
    expect(dialog.find("textarea").exists()).toBe(false);
    expect(dialog.get("button:not(.button--ghost)").attributes("disabled")).toBeUndefined();
  });

  it("keeps lifecycle snapshots behind a detail interaction instead of expanding them in the main table", async () => {
    installOwnerSession();
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/lifecycle-events")) return new Response(JSON.stringify(lifecycle), { status: 200 });
      return new Response(JSON.stringify({ ...baseBatch, effectiveStatus: "closed", lifecycleStatus: "CLOSED", manualOverride: "FORCE_CLOSED" }), { status: 200 });
    }));

    const wrapper = mount(BatchDetailPage, { global: {
      stubs: {
        AdminPageHeading: headingStub,
        AdminStatusPill: true,
        PaginationControls: true,
        NuxtPage: true,
        NuxtLink: linkStub,
      },
    } });
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain("查看详情");
    expect(wrapper.text()).not.toContain("人工覆盖");
  });

  it("keeps final adjustment entry with the alliance owner instead of exposing an online center suggestion", async () => {
    useSessionStore().applyApiSession({
      account: {
        id: "account-media-admin",
        adminLevel: "ADMIN",
        adminCenterId: "center-media",
        capabilities: ["recruitment.assessment.edit"],
      },
      person: { id: "person-media-admin", name: "新媒体中心负责人", status: "FORMAL_MEMBER" },
      mustChangePassword: false,
    });
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/adjustment-targets")) {
        return new Response(JSON.stringify({ items: [{ id: "center-talent", slug: "talent-development", name: "人才发展中心" }] }), { status: 200 });
      }
      if (url.endsWith("/assessments")) {
        return new Response(JSON.stringify({
          batch: { id: "batch-p0", name: "P0 API 招新", lifecycleStatus: "closed" },
          currentRound: 1,
          status: "ASSESSING",
          version: 3,
          publishedAt: null,
          pending: 0,
          adjustmentPending: 1,
          canAdvance: false,
          advanceBlocker: { code: "ASSESSMENT_ADJUSTMENT_PENDING", count: 1 },
          nextAction: "DECIDE_ADJUSTMENTS",
          items: [{
            applicationId: "application-adjustment",
            person: { id: "person-candidate", name: "待调剂成员", studentId: "20260001", grade: "2026", className: "软件一班" },
            acceptsAdjustment: true,
            baizeDirection: null,
            preferences: [{ rank: "FIRST", center: { id: "center-media", slug: "new-media", name: "新媒体中心" } }],
            roundResults: [{ round: 1, outcome: "FAILED", internalNote: null, createdAt: "2026-08-08T00:00:00.000Z" }],
            adjustmentProposal: null,
            adjustmentDecision: null,
            finalResult: null,
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify(baseBatch), { status: 200 });
    }));

    const wrapper = mount(RecruitmentAssessmentWorkbench, {
      props: { batchId: "batch-p0" },
      global: { stubs: { NuxtLink: linkStub } },
    });
    await flushPromises();
    await nextTick();
    await wrapper.get('button[aria-label="查看处理 待调剂成员"]').trigger("click");

    expect(wrapper.text()).toContain("调剂结果由联盟总负责人直接录入");
    expect(wrapper.text()).not.toContain("中心负责人只提交");
    expect(wrapper.text()).not.toContain("负责人建议后由总负责人确认");
    expect(wrapper.find('select[aria-label="建议去向"]').exists()).toBe(false);
  });
});
