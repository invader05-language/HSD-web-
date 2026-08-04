import { useSessionStore } from "~/stores/session";

export default defineNuxtPlugin({
  name: "session-restore",
  dependsOn: ["pinia"],
  setup() {
    useSessionStore().restore();
  }
});
