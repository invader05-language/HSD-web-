import { describe, expect, it } from "vitest";

type PortalView = "recommendations" | "visuals";
type PortalTabsModule = {
  resolvePortalTabKey?: (current: PortalView, key: string) => PortalView | undefined;
};

async function loadPortalTabs(): Promise<PortalTabsModule> {
  const modulePath = "../../app/utils/portal-tabs";
  return import(/* @vite-ignore */ modulePath).catch(() => ({}));
}

describe("portal configuration tab keyboard navigation", () => {
  it("wraps ArrowLeft and ArrowRight across the first and last tab", async () => {
    const { resolvePortalTabKey } = await loadPortalTabs();

    expect(resolvePortalTabKey).toBeTypeOf("function");
    expect(resolvePortalTabKey?.("recommendations", "ArrowLeft")).toBe("visuals");
    expect(resolvePortalTabKey?.("visuals", "ArrowRight")).toBe("recommendations");
    expect(resolvePortalTabKey?.("recommendations", "ArrowRight")).toBe("visuals");
    expect(resolvePortalTabKey?.("visuals", "ArrowLeft")).toBe("recommendations");
  });

  it("keeps Home and End explicit and ignores unrelated keys", async () => {
    const { resolvePortalTabKey } = await loadPortalTabs();

    expect(resolvePortalTabKey?.("visuals", "Home")).toBe("recommendations");
    expect(resolvePortalTabKey?.("recommendations", "End")).toBe("visuals");
    expect(resolvePortalTabKey?.("recommendations", "Tab")).toBeUndefined();
  });
});
