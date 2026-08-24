import { describe, expect, it } from "vitest";
import { formatActivityRegistrationNotice } from "../../app/utils/activity-registration-notice";

describe("activity registration status notices", () => {
  it("reports the saved open state instead of the stale pre-command activity object", () => {
    expect(formatActivityRegistrationNotice(true)).toBe("报名已开放，并已处理 activity.registration.opened 快讯草稿事件。");
  });

  it("reports the saved closed state instead of the stale pre-command activity object", () => {
    expect(formatActivityRegistrationNotice(false)).toBe("报名已关闭。");
  });
});
