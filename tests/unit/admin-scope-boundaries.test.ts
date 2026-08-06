import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ADMIN_ASSETS } from "../../app/data/admin-assets";
import { ADMIN_CANDIDATES } from "../../app/data/recruitment-admin";
import { RECRUITMENT_CENTERS } from "../../app/data/recruitment-application";
import { usePortalContentStore } from "../../app/stores/portal-content";
import { useSessionStore } from "../../app/stores/session";
import {
  canAccessPortalContent,
  canAccessRecruitmentCandidate,
} from "../../app/utils/admin-center-scope";

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe("admin scope boundaries", () => {
  it("keeps a center administrator within their first-choice recruitment roster", () => {
    const center = RECRUITMENT_CENTERS[1]!;
    const inScope = ADMIN_CANDIDATES.find((candidate) => candidate.preferences[0] === center)!;
    const outOfScope = ADMIN_CANDIDATES.find((candidate) => candidate.preferences[0] !== center)!;

    expect(canAccessRecruitmentCandidate(inScope, center)).toBe(true);
    expect(canAccessRecruitmentCandidate(outOfScope, center)).toBe(false);
  });

  it("prevents a center administrator from reading or mutating another administrator's draft", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const content = usePortalContentStore();
    const foreignDraft = {
      ...content.records[0]!,
      id: "foreign-draft",
      createdBy: "admin-alliance",
      status: "draft" as const,
      publishedState: "unpublished" as const,
      publishedRevision: undefined,
    };
    content.records.push(foreignDraft);

    expect(canAccessPortalContent(foreignDraft, {
      operatorId: session.currentAccount!.account,
      centerRole: session.currentAccount!.adminCenterRole,
    })).toBe(false);
    expect(() => content.updateDraft(foreignDraft.id, { title: "越权修改" }))
      .toThrow("PORTAL_CONTENT_FORBIDDEN");
    expect(() => content.submitForReview(foreignDraft.id))
      .toThrow("PORTAL_CONTENT_FORBIDDEN");
  });

  it("assigns photographer assets to the new-media center with a stable center identifier", () => {
    const photographerAsset = ADMIN_ASSETS.find((asset) => asset.id === "asset-salon") as {
      ownerCenterId?: string;
    } | undefined;

    expect(photographerAsset?.ownerCenterId).toBe("new-media");
  });
});
