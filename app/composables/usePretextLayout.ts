export function usePretextLayout(text: string, lineHeight = 29) {
  const target = ref<HTMLElement | null>(null);
  let observer: ResizeObserver | null = null;

  onBeforeUnmount(() => observer?.disconnect());

  onMounted(async () => {
    if (!target.value || !text) return;
    await document.fonts?.ready;
    const { layout, prepare } = await import("@chenglou/pretext");
    const element = target.value;
    if (!element) return;
    const update = () => {
      if (target.value !== element) return;
      const styles = getComputedStyle(element);
      const font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      const prepared = prepare(text, font, { wordBreak: "normal" });
      const result = layout(prepared, element.clientWidth, lineHeight);
      element.style.setProperty("--pretext-height", `${result.height}px`);
    };
    observer = new ResizeObserver(update);
    observer.observe(element);
    update();
  });

  return target;
}

