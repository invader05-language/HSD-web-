import { createPasswordRecoveryGateway, PasswordRecoveryApiError } from "~/services/password-recovery/password-recovery.gateway";

export function usePasswordRecoveryRequest() {
  const runtime = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
  const gateway = createPasswordRecoveryGateway({ apiBase: runtime.public.apiBase });
  const submitting = ref(false);
  const submitted = ref(false);
  const error = ref("");
  const message = ref("若账号存在，联盟总负责人将在完成身份核验后处理。请勿重复提交。");

  async function submit(account: string) {
    if (submitting.value) return;
    submitting.value = true;
    error.value = "";
    try {
      if (runtime.public.useMockApi) {
        submitted.value = true;
        return;
      }
      const result = await gateway.submit(account.trim());
      message.value = result.message;
      submitted.value = true;
    } catch (cause) {
      if (cause instanceof PasswordRecoveryApiError && cause.status === 429) error.value = "请求过于频繁，请稍后再试";
      else error.value = "暂时无法提交，请稍后重试";
    } finally {
      submitting.value = false;
    }
  }

  return { submitting, submitted, error, message, submit };
}
