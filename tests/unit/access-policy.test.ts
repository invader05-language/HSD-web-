import { describe, expect, it } from "vitest";
import { requiresLogin } from "../../app/utils/access-policy";

describe("requiresLogin", () => {
  it("keeps public browsing open and protects personal actions", () => {
    expect(requiresLogin({ kind: "view-project" })).toBe(false);
    expect(requiresLogin({ kind: "view-activity" })).toBe(false);
    expect(requiresLogin({ kind: "submit-activity" })).toBe(true);
    expect(requiresLogin({ kind: "view-assessment" })).toBe(true);
  });
});
