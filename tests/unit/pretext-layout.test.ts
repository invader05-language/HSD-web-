import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { usePretextLayout } from "../../app/composables/usePretextLayout";

const originalFontsDescriptor = Object.getOwnPropertyDescriptor(document, "fonts");

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalFontsDescriptor) {
    Object.defineProperty(document, "fonts", originalFontsDescriptor);
  } else {
    Reflect.deleteProperty(document, "fonts");
  }
});

describe("usePretextLayout", () => {
  it("does not observe a detached target when the page unmounts during async setup", async () => {
    let resolveFonts!: () => void;
    let markFontsAwaited!: () => void;
    const fontsReady = new Promise<void>((resolve) => {
      resolveFonts = resolve;
    });
    const fontsAwaited = new Promise<void>((resolve) => {
      markFontsAwaited = resolve;
    });
    const observedTargets: unknown[] = [];

    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: {
        get ready() {
          markFontsAwaited();
          return fontsReady;
        },
      },
    });
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("onMounted", onMounted);
    vi.stubGlobal("onBeforeUnmount", onBeforeUnmount);
    vi.stubGlobal("ResizeObserver", class {
      observe(target: unknown) {
        observedTargets.push(target);
        if (!(target instanceof Element)) throw new TypeError("ResizeObserver target must be an Element");
      }

      disconnect() {}
    });

    const wrapper = mount(defineComponent({
      setup() {
        return { target: usePretextLayout("异步排版内容") };
      },
      template: '<p ref="target">异步排版内容</p>',
    }));

    await nextTick();
    await fontsAwaited;
    wrapper.unmount();
    resolveFonts();
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(observedTargets).toEqual([]);
  });
});
