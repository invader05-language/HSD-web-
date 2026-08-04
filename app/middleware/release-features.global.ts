import { resolveDisabledRoute } from "~/utils/admin-release-access";

export default defineNuxtRouteMiddleware((to) => {
  const disabled = resolveDisabledRoute(to.path);
  if (!disabled) return;

  return navigateTo({
    path: disabled.to,
    query: { notice: disabled.notice },
    replace: true
  });
});
