import { beforeEach, describe, expect, it } from "vitest";
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
    expect(service.createFromEvent(failedEvent)).toEqual({ status: "failed", errorCode: "PORTAL_SOURCE_NOT_PUBLIC" });
    const failure = store.automationFailures[0]!;
    expect(failure.event).toMatchObject({ eventId: "event-failed" });
    expect(failure.audit[0]?.action).toBe("automation-failed");
    expect(store.retryAutomationDraft(failure.automationKey)).toEqual({ status: "failed", errorCode: "PORTAL_SOURCE_NOT_PUBLIC" });

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
});
