import { describe, expect, it } from "vitest";
import {
  buildLoginTarget,
  normalizeRedirectTarget,
  resolveLoginAwareTarget,
  resolveLoginContinuation
} from "../../app/utils/login-continuation";

describe("buildLoginTarget", () => {
  it("preserves the exact personal action route", () => {
    expect(buildLoginTarget("/activities/harmonyos?signup=1"))
      .toBe("/login?redirect=%2Factivities%2Fharmonyos%3Fsignup%3D1");
  });

  it("marks protected admin destinations as admin login continuations", () => {
    expect(buildLoginTarget("/admin/logs?query=release"))
      .toBe("/login?mode=admin&redirect=%2Fadmin%2Flogs%3Fquery%3Drelease");
  });
});

describe("resolveLoginContinuation", () => {
  it("infers admin mode from a legacy admin redirect", () => {
    expect(resolveLoginContinuation({ redirect: "/admin/logs?query=release" })).toEqual({
      mode: "admin",
      memberTarget: "/member",
      adminTarget: "/admin/logs?query=release"
    });
  });

  it("keeps the safe admin destination when a user selects member mode", () => {
    expect(resolveLoginContinuation({ mode: "member", redirect: "/admin/accounts" })).toEqual({
      mode: "member",
      memberTarget: "/member",
      adminTarget: "/admin/accounts"
    });
  });

  it("uses only member continuations in member mode", () => {
    expect(resolveLoginContinuation({ mode: "member", redirect: "/join/apply" })).toEqual({
      mode: "member",
      memberTarget: "/join/apply",
      adminTarget: "/admin"
    });
  });

  it("falls back to the relevant home route for unsafe or cross-mode targets", () => {
    expect(resolveLoginContinuation({ mode: "admin", redirect: "//outside.example/admin" }))
      .toEqual({ mode: "admin", memberTarget: "/member", adminTarget: "/admin" });
    expect(resolveLoginContinuation({ mode: "admin", redirect: "/member/results" }))
      .toEqual({ mode: "admin", memberTarget: "/member/results", adminTarget: "/admin" });
    expect(resolveLoginContinuation({ mode: "member", redirect: "/admin/logs" }))
      .toEqual({ mode: "member", memberTarget: "/member", adminTarget: "/admin/logs" });
  });

  it("rejects backslash protocol-relative redirects", () => {
    expect(normalizeRedirectTarget("/\\\\evil.example/admin")).toBe("/member");
    expect(resolveLoginContinuation({ mode: "admin", redirect: "/\\\\evil.example/admin" }))
      .toEqual({ mode: "admin", memberTarget: "/member", adminTarget: "/admin" });
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
