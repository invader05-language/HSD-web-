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
    expect(usePortalContentStore().records.filter((record) => record.originType === "system-event"))
      .toHaveLength(1);
  });
});
