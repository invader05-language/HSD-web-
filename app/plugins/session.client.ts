import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";

export default defineNuxtPlugin({
  name: "session-restore",
  dependsOn: ["pinia"],
  async setup() {
    const config = useRuntimeConfig() as { public: { useMockApi: boolean } };
    await useSessionStore().restoreForRuntime(config.public, useSessionGateway());
  }
});
