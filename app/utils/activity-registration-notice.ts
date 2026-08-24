const ACTIVITY_REGISTRATION_OPENED_EVENT = "activity.registration.opened";

export function formatActivityRegistrationNotice(registrationOpen: boolean): string {
  return registrationOpen
    ? `报名已开放，并已处理 ${ACTIVITY_REGISTRATION_OPENED_EVENT} 快讯草稿事件。`
    : "报名已关闭。";
}
