import { describe, expect, it } from "vitest";
import { buildLoginTarget } from "../../app/utils/login-continuation";

describe("buildLoginTarget", () => {
  it("preserves the exact personal action route", () => {
    expect(buildLoginTarget("/activities/harmonyos?signup=1"))
      .toBe("/login?redirect=%2Factivities%2Fharmonyos%3Fsignup%3D1");
  });
});
