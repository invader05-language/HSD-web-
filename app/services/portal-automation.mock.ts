import type { PortalAutomationResult, PortalSourceEvent } from "../types/portal-content";
import { usePortalContentStore } from "../stores/portal-content";

/**
 * Frontend-only transition adapter. Production creation remains the backend outbox requirement.
 */
export class PortalAutomationServiceMock {
  createFromEvent(event: PortalSourceEvent): PortalAutomationResult {
    return usePortalContentStore().createSystemDraft(event);
  }
}
