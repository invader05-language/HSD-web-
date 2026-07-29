import { defineStore } from "pinia";

export const useSessionStore = defineStore("session", {
  state: () => ({
    isAuthenticated: false,
    memberName: "演示成员"
  }),
  actions: {
    signIn() {
      this.isAuthenticated = true;
    },
    signOut() {
      this.isAuthenticated = false;
    }
  }
});

