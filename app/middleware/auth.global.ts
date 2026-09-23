import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";
import { resolveProtectedRouteTarget } from "~/utils/route-access";

export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSessionStore();
  if (import.meta.client && !session.isHydrated) {
    const config = useRuntimeConfig() as { public: { useMockApi: boolean } };
    await session.restoreForRuntime(config.public, useSessionGateway());
  }
  if (import.meta.client && session.isAuthenticated && to.path.startsWith("/admin")) {
    const config = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
    await session.refreshForRuntime(config.public, useSessionGateway());
  }
  const target = resolveProtectedRouteTarget(to.path, to.fullPath, session);
  if (target) return navigateTo(target, { replace: true });
});
