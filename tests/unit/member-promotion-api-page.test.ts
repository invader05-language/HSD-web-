import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("member detail production promotion flow", () => {
  it("collects authoritative membership fields and awaits the server promotion action", () => {
    const source = readFileSync("app/pages/admin/members/[id].vue", "utf8");

    expect(source).toContain("await memberAdministration.promoteMemberToFormalFromApi");
    expect(source).toContain('v-model="promotionCenterId"');
    expect(source).toContain('v-for="center in memberAdministration.apiCenters"');
    expect(source).toContain(':value="center.id"');
    expect(source).toContain('v-model="promotionDuty"');
    expect(source).toContain('v-model="promotionBaizeDirection"');
    expect(source).not.toContain("正式成员身份转换尚无服务端命令");
  });
});
