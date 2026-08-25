import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("public timeline page", () => {
  it("uses the server timeline for production tabs and keeps local catalog fallback isolated", () => {
    const source = readFileSync(resolve("app/pages/activities/index.vue"), "utf8");
    expect(source).toContain("gateway.timeline.listPublic");
    expect(source).toContain("activeKind");
    expect(source).toContain("PaginationControls");
    expect(source).not.toContain("refreshPublicFromApi(gateway)");
  });
});
