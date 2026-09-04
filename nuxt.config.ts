import tailwindcss from "@tailwindcss/vite";
import { resolveApiRuntimeConfig } from "./app/utils/api-runtime-config";

const browserApiRuntimeConfig = resolveApiRuntimeConfig({
  nodeEnv: process.env.NODE_ENV,
  apiBase: process.env.NUXT_PUBLIC_API_BASE,
  useMockApi: process.env.NUXT_PUBLIC_USE_MOCK_API === "true",
  e2eTestOnly: process.env.HSD_E2E_TEST_ONLY === "true",
});

export default defineNuxtConfig({
  compatibilityDate: "2026-07-28",
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      apiBase: browserApiRuntimeConfig.apiBase,
      useMockApi: browserApiRuntimeConfig.useMockApi,
    }
  },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      htmlAttrs: { lang: "zh-CN" },
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#B1202B" }
      ],
      link: [{ rel: "icon", href: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect width=%2264%22 height=%2264%22 rx=%2210%22 fill=%22%23B1202B%22/><text x=%2232%22 y=%2241%22 text-anchor=%22middle%22 font-size=%2226%22 fill=%22white%22>H</text></svg>" }]
    }
  },
  routeRules: {
    "/": { ssr: false },
    "/about": { ssr: true },
    "/centers": { ssr: true },
    "/projects/**": { ssr: true },
    "/activities/**": { ssr: false },
    "/updates/**": { ssr: false },
    "/gallery": { ssr: true },
    "/resources": { ssr: true },
    "/join/**": { ssr: false },
    "/member/**": { ssr: false },
    "/admin/**": { ssr: false }
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          hashCharacters: "hex"
        }
      }
    },
    define: {
      __VUE_PROD_DEVTOOLS__: false
    },
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["pinia"]
    }
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
});
