import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { PortalAutomationServiceMock } from "../../app/services/portal-automation.mock";
import { usePortalContentStore } from "../../app/stores/portal-content";

describe("portal automation mock", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("creates one recruitment flash draft for a source event version and suppresses duplicates", () => {
    const event = {
      eventId: "event-1",
      eventType: "recruitment.batch.opened" as const,
      occurredAt: "2026-08-04T09:00:00.000Z",
      actorId: "admin-alliance",
      sourceDomain: "recruitment-batch" as const,
      sourceId: "batch-current",
      sourceVersion: 2,
      payload: {
        batchName: "2026 秋季招新",
        publicRoute: "/join",
        publicEndAt: "2026-09-01T00:00:00.000Z",
        isOpen: true,
      },
    };
    const service = new PortalAutomationServiceMock();

    expect(service.createFromEvent(event)).toMatchObject({ status: "created" });
    expect(service.createFromEvent(event)).toEqual({ status: "duplicate" });
    const store = usePortalContentStore();
    expect(store.records.filter((record) => record.originType === "system-event"))
      .toHaveLength(1);
    expect(store.records.find((record) => record.originType === "system-event")?.audit[0]?.action)
      .toBe("automation-duplicate");
  });

  it("persists failed envelopes for retries and prevents event-type id collisions", () => {
    const service = new PortalAutomationServiceMock();
    const failedEvent = {
      eventId: "event-failed", eventType: "recruitment.batch.opened" as const, occurredAt: "2026-08-04T09:00:00.000Z", actorId: "admin-alliance",
      sourceDomain: "recruitment-batch" as const, sourceId: "shared", sourceVersion: 1,
      payload: { batchName: "秋季招新", publicRoute: "/join", publicEndAt: "2026-09-01T00:00:00.000Z", isOpen: false },
    };
    const store = usePortalContentStore();
    expect(service.createFromEvent(failedEvent)).toMatchObject({ status: "failed", errorCode: "PORTAL_SOURCE_NOT_PUBLIC" });
    const failure = store.automationFailures[0]!;
    expect(failure.event).toMatchObject({ eventId: "event-failed" });
    expect(failure.audit[0]?.action).toBe("automation-failed");
    expect(store.retryAutomationDraft(failure.automationKey)).toMatchObject({ status: "failed", errorCode: "PORTAL_SOURCE_NOT_PUBLIC" });

    const recruitment = { ...failedEvent, payload: { ...failedEvent.payload, isOpen: true } };
    const activity = {
      ...recruitment, eventId: "event-activity", eventType: "activity.registration.opened" as const,
      sourceDomain: "activity" as const,
      payload: { activityTitle: "同名活动", slug: "shared", publicRoute: "/activities/shared", publicEndAt: "2026-09-01T00:00:00.000Z", isOpen: true },
    };
    expect(service.createFromEvent(recruitment)).toMatchObject({ status: "created" });
    expect(service.createFromEvent(activity)).toMatchObject({ status: "created" });
    expect(new Set(store.records.filter((record) => record.originType === "system-event").map((record) => record.id)).size)
      .toBe(2);
  });

  it("keeps distinct semantic keys distinct when source ids normalize to the same text", () => {
    const service = new PortalAutomationServiceMock();
    const base = {
      eventId: "event-a", eventType: "recruitment.batch.opened" as const, occurredAt: "2026-08-04T09:00:00.000Z", actorId: "admin-alliance",
      sourceDomain: "recruitment-batch" as const, sourceVersion: 1,
      payload: { batchName: "秋季招新", publicRoute: "/join", publicEndAt: "2026-09-01T00:00:00.000Z", isOpen: true },
    };
    service.createFromEvent({ ...base, sourceId: "batch.one" });
    service.createFromEvent({ ...base, eventId: "event-b", sourceId: "batch-one" });

    const ids = usePortalContentStore().records
      .filter((record) => record.originType === "system-event")
      .map((record) => record.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("retains a retryable semantic-key failure when system-draft persistence fails", () => {
    const event = {
      eventId: "event-persistence-failed",
      eventType: "activity.registration.opened" as const,
      occurredAt: "2026-08-04T09:00:00.000Z",
      actorId: "admin-alliance",
      sourceDomain: "activity" as const,
      sourceId: "activity-retry",
      sourceVersion: 8,
      payload: {
        activityTitle: "重试活动",
        slug: "activity-retry",
        publicRoute: "/activities/activity-retry",
        publicEndAt: "2026-09-01T00:00:00.000Z",
        isOpen: true,
      },
    };
    const store = usePortalContentStore();
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    const result = new PortalAutomationServiceMock().createFromEvent(event);

    expect(result).toMatchObject({
      status: "failed",
      errorCode: "PORTAL_CONTENT_PERSISTENCE_FAILED",
      automationKey: "activity:activity-retry:activity.registration.opened:8",
    });
    expect(store.records.some((record) => record.sourceId === "activity-retry")).toBe(false);
    expect(store.automationFailures[0]).toMatchObject({
      automationKey: "activity:activity-retry:activity.registration.opened:8",
      event: { eventId: "event-persistence-failed" },
      errorCode: "PORTAL_CONTENT_PERSISTENCE_FAILED",
    });
    expect(store.automationFailures[0]?.audit[0]).toMatchObject({
      action: "automation-failed",
      actorId: "system",
      targetId: "activity:activity-retry:activity.registration.opened:8",
      beforeRevision: 0,
      afterRevision: 0,
      reason: "PORTAL_CONTENT_PERSISTENCE_FAILED",
      sourceEventId: "event-persistence-failed",
    });

    setItem.mockRestore();
    expect(store.retryAutomationDraft("activity:activity-retry:activity.registration.opened:8"))
      .toMatchObject({ status: "created" });
    expect(store.automationFailures).toEqual([]);
  });
});
