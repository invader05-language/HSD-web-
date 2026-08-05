export function useRecruitmentNow(intervalMs = 60_000) {
  const now = ref(new Date());
  let timer: ReturnType<typeof setInterval> | undefined;

  onMounted(() => {
    timer = setInterval(() => {
      now.value = new Date();
    }, intervalMs);
  });

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
  });

  return now;
}
