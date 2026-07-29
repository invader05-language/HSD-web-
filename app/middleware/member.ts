import { useSessionStore } from "~/stores/session";
import { buildLoginTarget } from "~/utils/login-continuation";

export default defineNuxtRouteMiddleware((to) => {
  const session = useSessionStore();
  if (!session.isAuthenticated) {
    return navigateTo(buildLoginTarget(to.fullPath));
  }
});
