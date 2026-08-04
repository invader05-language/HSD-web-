import { useSessionStore } from "~/stores/session";
import { resolveProtectedRouteTarget } from "~/utils/route-access";

export default defineNuxtRouteMiddleware((to) => {
  const session = useSessionStore();
  if (import.meta.client && !session.isAuthenticated) session.restore();
  const target = resolveProtectedRouteTarget(to.path, to.fullPath, session);
  if (target) return navigateTo(target);
});
