export function usePretextLayout(text: string, lineHeight = 29) {
  const target = ref<HTMLElement | null>(null);

  onMounted(async () => {
    if (!target.value || !text) return;
    await document.fonts?.ready;
    const { layout, prepare } = await import("@chenglou/pretext");
    const update = () => {
      if (!target.value) return;
      const styles = getComputedStyle(target.value);
      const font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      const prepared = prepare(text, font, { wordBreak: "normal" });
      const result = layout(prepared, target.value.clientWidth, lineHeight);
      target.value.style.setProperty("--pretext-height", `${result.height}px`);
    };
    const observer = new ResizeObserver(update);
    observer.observe(target.value);
    update();
    onBeforeUnmount(() => observer.disconnect());
  });

  return target;
}

