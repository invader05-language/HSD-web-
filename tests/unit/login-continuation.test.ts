import { describe, expect, it } from "vitest";
import { buildLoginTarget, resolveLoginAwareTarget } from "../../app/utils/login-continuation";

describe("buildLoginTarget", () => {
  it("preserves the exact personal action route", () => {
    expect(buildLoginTarget("/activities/harmonyos?signup=1"))
      .toBe("/login?redirect=%2Factivities%2Fharmonyos%3Fsignup%3D1");
  });
});

describe("resolveLoginAwareTarget", () => {
  it("directs authenticated members to the protected route", () => {
    expect(resolveLoginAwareTarget("/join/apply", true)).toBe("/join/apply");
  });

  it("keeps guests on the login continuation route", () => {
    expect(resolveLoginAwareTarget("/join/apply", false))
      .toBe("/login?redirect=%2Fjoin%2Fapply");
  });
});
