import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { AssessmentBatchResponseDto, AssessmentCandidateDto } from "../../packages/api-client/src";
import type { RecruitmentGateway } from "../../app/services/recruitment/recruitment-gateway";
import { RecruitmentApiError } from "../../app/services/recruitment/api-recruitment.gateway";
import { useRecruitmentAssessmentStore } from "../../app/stores/recruitment-assessment";
import { useSessionStore } from "../../app/stores/session";
import { getRecruitmentAssessmentMessage } from "../../app/utils/recruitment-assessment-messages";
import { filterAndSortRecruitmentApplications } from "../../app/data/recruitment-admin";
import Workbench from "../../app/components/admin/RecruitmentAssessmentWorkbench.vue";

const runtime = vi.hoisted(() => ({ gateway: undefined as RecruitmentGateway | undefined }));
vi.mock("../../app/composables/useRecruitmentGateway", () => ({ useRecruitmentGateway: () => runtime.gateway }));
enableAutoUnmount(afterEach);

const result = { round: 1, outcome: "PASSED" as const, internalNote: "server note", createdAt: "2026-10-15T01:02:03Z" };
function candidate(overrides: Partial<AssessmentCandidateDto> = {}): AssessmentCandidateDto {
  return {
    applicationId: "application-1", person: { id: "person-1", name: "张同学", studentId: "20260001", grade: "2026", className: "一班" },
    acceptsAdjustment: false, baizeDirection: null,
    preferences: [{ rank: "FIRST", center: { id: "media", slug: "media", name: "新媒体中心" } }],
    roundResults: [], adjustmentProposal: null, adjustmentDecision: null, finalResult: null, ...overrides,
  };
}
function batch(overrides: Partial<AssessmentBatchResponseDto> = {}): AssessmentBatchResponseDto {
  return { batch: { id: "batch-1", name: "招新", lifecycleStatus: "closed" }, currentRound: 1, status: "ASSESSING", version: 3, publishedAt: null,
    pending: 1, adjustmentPending: 0, canAdvance: false, advanceBlocker: null, nextAction: "RECORD_CURRENT_ROUND_RESULTS", items: [candidate()], ...overrides };
}
function api() {
  return {
    getAssessmentBatch: vi.fn().mockResolvedValue(batch()),
    getAdjustmentTargets: vi.fn().mockResolvedValue({ items: [] }),
    recordRoundResult: vi.fn().mockResolvedValue({ version: 4, result }),
  } as unknown as RecruitmentGateway & {
    getAssessmentBatch: ReturnType<typeof vi.fn>;
    recordRoundResult: ReturnType<typeof vi.fn>;
  };
}
const input = { batchId: "batch-1", candidateId: "application-1", round: 1 as const, outcome: "passed" as const, internalNote: "my draft" };
const duplicate = () => new RecruitmentApiError({ code: "ROUND_RESULT_ALREADY_RECORDED", status: 409, message: "Already recorded", requestId: "request-1" });

beforeEach(() => {
  localStorage.clear(); setActivePinia(createPinia());
  for (const [name, value] of Object.entries({ computed, nextTick, onBeforeUnmount, reactive, ref, watch })) vi.stubGlobal(name, value);
  vi.stubGlobal("useRoute", () => ({ params: {}, query: {} }));
  useSessionStore().applyApiSession({ account: { id: "owner", adminLevel: "OWNER", adminCenterId: null, capabilities: ["recruitment.assessment.edit"] }, person: { id: "owner", name: "负责人", status: "FORMAL_MEMBER" }, mustChangePassword: false });
});
afterEach(() => { vi.unstubAllGlobals(); runtime.gateway = undefined; });

async function setup() {
  const gateway = api(); runtime.gateway = gateway;
  const wrapper = mount(Workbench, { props: { batchId: "batch-1" }, global: { stubs: { NuxtLink: true } } });
  await flushPromises();
  await wrapper.get('[aria-label="查看处理 张同学"]').trigger("click");
  await wrapper.get('[aria-label="第一轮结果"]').setValue("failed");
  await wrapper.get('[aria-label="内部备注"]').setValue("my draft");
  return { gateway, wrapper, store: useRecruitmentAssessmentStore() };
}
async function save(wrapper: Awaited<ReturnType<typeof setup>>["wrapper"]) {
  await wrapper.findAll("button").find(button => button.text() === "保存结果")!.trigger("click");
  await wrapper.findAll("button").find(button => button.text() === "确认保存")!.trigger("click");
  await flushPromises();
}

describe("assessment save feedback and recovery", () => {
  it("releases busy after a rejected POST and preserves structured error fields", async () => {
    const gateway = api(), store = useRecruitmentAssessmentStore();
    await store.refreshAssessmentBatch("batch-1", gateway);
    gateway.recordRoundResult.mockRejectedValue(duplicate());
    await store.saveRoundOutcomeFromApi(gateway, input).catch(() => undefined);
    expect(store.apiMutatingByBatch["batch-1"]).toBe(false);
    expect(store.apiErrorByBatch["batch-1"]).toMatchObject({ code: "ROUND_RESULT_ALREADY_RECORDED", status: 409, requestId: "request-1" });
    expect(JSON.parse(JSON.stringify(store.apiErrorByBatch["batch-1"]))).toEqual(store.apiErrorByBatch["batch-1"]);
  });

  it("applies a known committed result before a failing GET and retries only reads", async () => {
    const { gateway, wrapper, store } = await setup();
    gateway.getAssessmentBatch.mockRejectedValueOnce(new Error("offline"));
    await save(wrapper);
    expect(wrapper.text()).toContain("结果已保存，名单刷新失败，请重试刷新。");
    expect(store.getCandidate("batch-1", "application-1")).toMatchObject({ roundOutcomes: { 1: "passed" }, updatedAt: result.createdAt });
    expect(store.getBatchState("batch-1").version).toBe(4);
    expect(wrapper.get('[aria-label="内部备注"]').element).toHaveProperty("value", "my draft");
    expect(wrapper.get('[aria-label="第一轮结果"]').element).toHaveProperty("value", "passed");
    expect(wrapper.text()).toContain("未提交草稿：不通过");
    gateway.getAssessmentBatch.mockResolvedValue(batch({ version: 4, items: [candidate({ roundResults: [result] })] }));
    await wrapper.get('[data-testid="assessment-retry-refresh"]').trigger("click"); await flushPromises();
    expect(gateway.recordRoundResult).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("结果已保存到服务器");
  });

  it.each([true, false])("refreshes duplicate results without claiming refresh when GET succeeds=%s", async (readSucceeds) => {
    const { gateway, wrapper } = await setup(); gateway.recordRoundResult.mockRejectedValue(duplicate());
    if (readSucceeds) gateway.getAssessmentBatch.mockResolvedValue(batch({ items: [candidate({ roundResults: [result] })] }));
    else gateway.getAssessmentBatch.mockRejectedValue(new Error("offline"));
    await save(wrapper);
    expect(wrapper.text()).toContain(readSucceeds ? "该成员本轮结果已录入，已刷新当前记录。" : "该成员本轮结果已录入，暂未能读取最新记录，请重试刷新。");
    expect(wrapper.get('[aria-label="内部备注"]').element).toHaveProperty("value", "my draft");
    expect(wrapper.text()).not.toContain("结果已保存到服务器");
    if (readSucceeds) {
      expect(wrapper.get('[aria-label="第一轮结果"]').element).toHaveProperty("value", "passed");
      expect(wrapper.get('[aria-label="第一轮结果"]').attributes("disabled")).toBeDefined();
    }
  });

  it.each([true, false])("reads once after unknown POST and preserves draft, record found=%s", async (recordFound) => {
    const { gateway, wrapper, store } = await setup(); gateway.recordRoundResult.mockRejectedValue(new TypeError("Failed to fetch"));
    gateway.getAssessmentBatch.mockResolvedValue(batch({ items: [candidate({ roundResults: recordFound ? [result] : [] })] }));
    await save(wrapper);
    expect(wrapper.text()).toContain("暂不能确认保存状态，请先刷新核对。");
    expect(gateway.getAssessmentBatch).toHaveBeenCalledTimes(2); expect(gateway.recordRoundResult).toHaveBeenCalledTimes(1);
    expect(store.apiMutatingByBatch["batch-1"]).toBe(false);
    expect(wrapper.get('[aria-label="内部备注"]').element).toHaveProperty("value", "my draft");
    expect(wrapper.text()).not.toContain("结果已保存到服务器");
    expect(wrapper.findAll("button").find(button => button.text() === "保存结果")!.attributes("disabled")).toBeDefined();
    if (!recordFound) {
      await wrapper.get('[data-testid="assessment-reconfirm"]').trigger("click");
      expect(wrapper.findAll("button").find(button => button.text() === "保存结果")!.attributes("disabled")).toBeUndefined();
      expect(gateway.recordRoundResult).toHaveBeenCalledTimes(1);
    }
  });

  it("preserves the attempted round when a conflict refresh advances the batch", async () => {
    const { gateway, wrapper } = await setup();
    gateway.recordRoundResult.mockRejectedValue(new RecruitmentApiError({ code: "ASSESSMENT_ROUND_CHANGED", status: 409, message: "Round changed" }));
    gateway.getAssessmentBatch.mockResolvedValue(batch({ currentRound: 2 }));
    await save(wrapper);
    expect(wrapper.get('[aria-label="第一轮结果"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[aria-label="内部备注"]').element).toHaveProperty("value", "my draft");
    expect(wrapper.text()).toContain("轮次已变化");
  });

  it("does not submit twice while a POST is pending and clears member feedback on close", async () => {
    const { gateway, wrapper } = await setup();
    let reject!: (error: unknown) => void;
    gateway.recordRoundResult.mockImplementation(() => new Promise((_, rejectPromise) => { reject = rejectPromise; }));
    await wrapper.findAll("button").find(button => button.text() === "保存结果")!.trigger("click");
    const confirm = wrapper.findAll("button").find(button => button.text() === "确认保存")!;
    await confirm.trigger("click"); await confirm.trigger("click"); expect(gateway.recordRoundResult).toHaveBeenCalledTimes(1);
    reject(duplicate()); await flushPromises();
    await wrapper.get('[aria-label="关闭详情"]').trigger("click"); await flushPromises();
    expect(wrapper.text()).not.toContain("该成员本轮结果已录入");
  });

  it("keeps an unknown save guarded after closing and reopening its member", async () => {
    const { gateway, wrapper } = await setup();
    gateway.recordRoundResult.mockRejectedValue(new TypeError("Failed to fetch"));
    await save(wrapper);
    await wrapper.get('[aria-label="关闭详情"]').trigger("click");
    await wrapper.get('[aria-label="查看处理 张同学"]').trigger("click");
    expect(wrapper.findAll("button").find(button => button.text() === "保存结果")!.attributes("disabled")).toBeDefined();
    expect(wrapper.get('[aria-label="内部备注"]').element).toHaveProperty("value", "my draft");
    expect(wrapper.get('[aria-label="第一轮结果"]').element).toHaveProperty("value", "failed");
    expect(wrapper.text()).toContain("暂不能确认保存状态，请先刷新核对。");
  });

  it("keeps unknown when its automatic read also fails, then shows actual records after GET retry", async () => {
    const { gateway, wrapper } = await setup();
    gateway.recordRoundResult.mockRejectedValue(new TypeError("Failed to fetch"));
    gateway.getAssessmentBatch.mockRejectedValueOnce(new Error("offline"));
    await save(wrapper);
    expect(wrapper.text()).toContain("暂不能确认保存状态，请先刷新核对。");
    expect(wrapper.find('[data-testid="assessment-reconfirm"]').exists()).toBe(false);
    gateway.getAssessmentBatch.mockResolvedValue(batch({ items: [candidate({ roundResults: [result] })] }));
    await wrapper.get('[data-testid="assessment-retry-refresh"]').trigger("click"); await flushPromises();
    expect(wrapper.get('[aria-label="第一轮结果"]').element).toHaveProperty("value", "passed");
    expect(wrapper.get('[aria-label="内部备注"]').element).toHaveProperty("value", "my draft");
    expect(wrapper.text()).toContain("服务器当前备注：server note");
    expect(wrapper.text()).toContain("暂不能确认保存状态，请先刷新核对。");
    expect(gateway.recordRoundResult).toHaveBeenCalledTimes(1);
  });

  it("prevents an older GET response from replacing a newer batch read", async () => {
    const gateway = api(), store = useRecruitmentAssessmentStore();
    let release!: (value: AssessmentBatchResponseDto) => void;
    gateway.getAssessmentBatch.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const earlier = store.refreshAssessmentBatch("batch-1", gateway);
    gateway.getAssessmentBatch.mockResolvedValue(batch({ version: 5, currentRound: 2 }));
    await store.refreshAssessmentBatch("batch-1", gateway);
    release(batch({ version: 3 })); await earlier;
    expect(store.getBatchState("batch-1")).toMatchObject({ version: 5, currentRound: 2 });
  });

  it("ignores a late POST feedback after switching to another member", async () => {
    const { gateway, wrapper } = await setup();
    let reject!: (error: unknown) => void;
    gateway.recordRoundResult.mockImplementation(() => new Promise((_, rejectPromise) => { reject = rejectPromise; }));
    await wrapper.findAll("button").find(button => button.text() === "保存结果")!.trigger("click");
    await wrapper.findAll("button").find(button => button.text() === "确认保存")!.trigger("click");
    await wrapper.get('[aria-label="关闭详情"]').trigger("click");
    reject(duplicate()); await flushPromises();
    expect(wrapper.text()).not.toContain("该成员本轮结果已录入");
  });

  it("keeps global command failures rejected when their followup refresh fails", async () => {
    const gateway = api(), store = useRecruitmentAssessmentStore(); await store.refreshAssessmentBatch("batch-1", gateway);
    gateway.getAssessmentBatch.mockRejectedValue(new Error("offline"));
    await expect(store.runApiMutation(gateway, "batch-1", async () => ({ version: 4 }))).rejects.toThrow();
    expect(store.apiMutatingByBatch["batch-1"]).toBe(false);
  });

  it("applies a committed adjustment decision and keeps GET-only retry after refresh failure", async () => {
    const gateway = api(); runtime.gateway = gateway;
    const adjustmentCandidate = candidate({ acceptsAdjustment: true, roundResults: [{ ...result, outcome: "FAILED" }] });
    gateway.getAssessmentBatch.mockResolvedValue(batch({ items: [adjustmentCandidate] }));
    gateway.getAdjustmentTargets = vi.fn().mockResolvedValue({ items: [{ id: "talent", slug: "talent", name: "人才发展中心" }] });
    const decision = { decision: "ADMITTED" as const, targetCenter: { id: "talent", slug: "talent", name: "人才发展中心" }, createdAt: "2026-10-15T02:00:00Z" };
    gateway.decideAdjustment = vi.fn().mockResolvedValue({ version: 4, decision });
    const wrapper = mount(Workbench, { props: { batchId: "batch-1" }, global: { stubs: { NuxtLink: true } } }); await flushPromises();
    await wrapper.get('.admin-filters select').setValue("全部成员");
    await wrapper.get('[aria-label="查看处理 张同学"]').trigger("click");
    await wrapper.get('[aria-label="最终调剂结果"]').setValue("talent");
    gateway.getAssessmentBatch.mockRejectedValueOnce(new Error("offline"));
    await save(wrapper);
    expect(wrapper.text()).toContain("结果已保存，名单刷新失败，请重试刷新。");
    expect(useRecruitmentAssessmentStore().getCandidate("batch-1", "application-1")).toMatchObject({ finalDecision: "admitted", finalCenter: "人才发展中心", updatedAt: decision.createdAt });
    expect(wrapper.text()).toContain("服务器当前最终结果：录取至人才发展中心");
    gateway.getAssessmentBatch.mockResolvedValue(batch({ version: 4, items: [candidate({ ...adjustmentCandidate, adjustmentDecision: decision })] }));
    await wrapper.get('[data-testid="assessment-retry-refresh"]').trigger("click"); await flushPromises();
    expect(gateway.decideAdjustment).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("结果已保存到服务器");
  });

  it.each([false, true])("uses unknown recovery for an adjustment without auto-submitting, record found=%s", async (recordFound) => {
    const gateway = api(); runtime.gateway = gateway;
    gateway.getAssessmentBatch.mockResolvedValue(batch({ items: [candidate({ acceptsAdjustment: true, roundResults: [{ ...result, outcome: "FAILED" }] })] }));
    gateway.decideAdjustment = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const wrapper = mount(Workbench, { props: { batchId: "batch-1" }, global: { stubs: { NuxtLink: true } } }); await flushPromises();
    await wrapper.get('.admin-filters select').setValue("全部成员");
    await wrapper.get('[aria-label="查看处理 张同学"]').trigger("click");
    await wrapper.get('[aria-label="最终调剂结果"]').setValue("not-admitted");
    if (recordFound) gateway.getAssessmentBatch.mockResolvedValue(batch({ items: [candidate({ acceptsAdjustment: true, roundResults: [{ ...result, outcome: "FAILED" }], adjustmentDecision: { decision: "NOT_ADMITTED", targetCenter: null, createdAt: result.createdAt } })] }));
    await save(wrapper);
    expect(wrapper.text()).toContain("暂不能确认保存状态，请先刷新核对。");
    if (recordFound) expect(wrapper.text()).toContain("服务器当前最终结果：不录取");
    else expect(wrapper.get('[aria-label="最终调剂结果"]').element).toHaveProperty("value", "not-admitted");
    expect(gateway.decideAdjustment).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll("button").find(button => button.text() === "保存结果")!.attributes("disabled")).toBeDefined();
    expect(wrapper.find('[data-testid="assessment-reconfirm"]').exists()).toBe(!recordFound);
  });

  it("applies a committed proposal timestamp and identity before a failing refresh", async () => {
    const gateway = api(), store = useRecruitmentAssessmentStore(); await store.refreshAssessmentBatch("batch-1", gateway);
    gateway.proposeAdjustment = vi.fn().mockResolvedValue({ version: 4, proposal: { targetCenter: { id: "talent", slug: "talent", name: "人才发展中心" }, createdAt: "2026-10-15T02:00:00Z" } });
    gateway.getAssessmentBatch.mockRejectedValue(new Error("offline"));
    const saved = await store.recordAdjustmentSuggestionFromApi(gateway, { batchId: "batch-1", candidateId: "application-1", targetCenterId: "talent" });
    expect(saved.status).toBe("saved-refresh-failed");
    expect(store.getCandidate("batch-1", "application-1")).toMatchObject({ adjustmentSuggestionIdentity: { id: "talent" }, updatedAt: "2026-10-15T02:00:00Z" });
    expect(store.getBatchState("batch-1").version).toBe(4);
    expect(store.apiMutatingByBatch["batch-1"]).toBe(false);
  });
});

describe("assessment dates and error translations", () => {
  it.each(["submittedAt.asc", "submittedAt.desc"] as const)("places missing and invalid application dates last for %s", (sort) => {
    const profiles = [{ name: "missing", studentId: "1", preferences: ["新媒体中心"] as ["新媒体中心"] },
      { name: "invalid", studentId: "2", preferences: ["新媒体中心"] as ["新媒体中心"], submittedAt: "invalid" },
      { name: "valid", studentId: "3", preferences: ["新媒体中心"] as ["新媒体中心"], submittedAt: "2026-10-15T00:00:00Z" }];
    expect(filterAndSortRecruitmentApplications(profiles, { query: "", firstChoice: "全部中心", sort }).map(profile => profile.name)).toEqual(["valid", "missing", "invalid"]);
  });
  it.each([[[]], [[{ ...result, createdAt: "invalid" }]], [[{ ...result, createdAt: "1970-01-01T00:00:00.000Z" }]]])("does not invent timestamps for missing or invalid dates %j", async (roundResults) => {
    const gateway = api(), store = useRecruitmentAssessmentStore();
    gateway.getAssessmentBatch.mockResolvedValue(batch({ items: [candidate({ roundResults })] }));
    await store.refreshAssessmentBatch("batch-1", gateway);
    const value = store.getCandidate("batch-1", "application-1")!;
    expect(value.updatedAt).toBeUndefined(); expect(value.candidate?.updatedAt).toBeUndefined(); expect(value.candidate?.submittedAt).toBeUndefined();
    runtime.gateway = gateway; const wrapper = mount(Workbench, { props: { batchId: "batch-1" }, global: { stubs: { NuxtLink: true } } }); await flushPromises();
    await wrapper.get('.admin-filters select').setValue("全部成员");
    expect(wrapper.get("tbody tr").findAll("td")[7]!.text()).toBe(roundResults.length ? "—" : "未录入");
  });

  it("selects dates numerically and displays Shanghai time in 24 hour form", async () => {
    const gateway = api(), store = useRecruitmentAssessmentStore();
    gateway.getAssessmentBatch.mockResolvedValue(batch({ items: [candidate({ roundResults: [{ ...result, createdAt: "2026-10-15T12:00:00+08:00" }, { ...result, round: 2, createdAt: "2026-10-15T05:00:00Z" }] })] }));
    await store.refreshAssessmentBatch("batch-1", gateway); runtime.gateway = gateway;
    const wrapper = mount(Workbench, { props: { batchId: "batch-1" }, global: { stubs: { NuxtLink: true } } }); await flushPromises();
    await wrapper.get('.admin-filters select').setValue("全部成员");
    expect(store.getCandidate("batch-1", "application-1")?.updatedAt).toBe("2026-10-15T05:00:00Z");
    expect(wrapper.get("tbody tr").findAll("td")[7]!.text()).toContain("13:00:00");
  });

  it.each([
    ["ROUND_RESULT_ALREADY_RECORDED", "该成员本轮结果已录入"],
    ["ASSESSMENT_ROUND_CHANGED", "轮次已变化"],
    ["ASSESSMENT_ROUND_ALREADY_PUBLISHED", "已发布"],
    ["ASSESSMENT_VERSION_CONFLICT", "版本已变化"],
    ["ASSESSMENT_CENTER_SCOPE_FORBIDDEN", "权限"],
  ])("translates structured and legacy string errors: %s", (code, expected) => {
    expect(getRecruitmentAssessmentMessage({ code, status: 409, message: "English" })).toContain(expected);
    expect(getRecruitmentAssessmentMessage(code)).toContain(expected);
  });
});
