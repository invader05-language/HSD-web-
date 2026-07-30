import { useSessionStore } from "~/stores/session";
import { buildLoginTarget } from "~/utils/login-continuation";

export default defineNuxtRouteMiddleware((to) => {
  const protectedRoute =
    to.path.startsWith("/member")
    || to.path.startsWith("/admin")
    || to.path === "/join/apply"
    || to.path === "/assessment-results";
  if (!protectedRoute) return;

  const session = useSessionStore();
  if (!session.isAuthenticated) {
    return navigateTo(buildLoginTarget(to.fullPath));
  }
});
