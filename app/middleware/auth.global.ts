import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";
import { resolveProtectedRouteTarget } from "~/utils/route-access";

export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSessionStore();
  if (import.meta.client && !session.isHydrated) {
    const config = useRuntimeConfig() as { public: { useMockApi: boolean } };
    await session.restoreForRuntime(config.public, useSessionGateway());
  }
  const target = resolveProtectedRouteTarget(to.path, to.fullPath, session);
  if (target) return navigateTo(target);
});
