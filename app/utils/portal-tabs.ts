export type PortalConfigView = "recommendations" | "visuals";

const PORTAL_CONFIG_VIEWS: readonly PortalConfigView[] = ["recommendations", "visuals"];

export function resolvePortalTabKey(current: PortalConfigView, key: string): PortalConfigView | undefined {
  if (key === "Home") return PORTAL_CONFIG_VIEWS[0];
  if (key === "End") return PORTAL_CONFIG_VIEWS.at(-1);
  if (key !== "ArrowLeft" && key !== "ArrowRight") return undefined;

  const direction = key === "ArrowRight" ? 1 : -1;
  const currentIndex = PORTAL_CONFIG_VIEWS.indexOf(current);
  const nextIndex = (currentIndex + direction + PORTAL_CONFIG_VIEWS.length) % PORTAL_CONFIG_VIEWS.length;
  return PORTAL_CONFIG_VIEWS[nextIndex];
}
