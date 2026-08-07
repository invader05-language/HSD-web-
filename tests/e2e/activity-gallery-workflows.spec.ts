import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, account: string, target: string) {
  const loginTarget = account === "demo-member"
    ? `/login?redirect=${encodeURIComponent(target)}`
    : target;
  await page.goto(loginTarget);
  await page.getByLabel("学号或成员账号").fill(account);
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(target);
}

test("owner can publish an activity and review a member registration", async ({ page }) => {
  await signIn(page, "admin-alliance", "/admin/activities/new");
  await page.getByLabel("标题").fill("端到端活动闭环验证");
  await page.getByLabel("分类").selectOption({ label: "技术沙龙" });
  await page.getByLabel("日期").fill("2026-09-20");
  await page.getByLabel("时间").selectOption({ label: "19:00–21:00" });
  await page.getByLabel("地点").fill("线上会议室");
  await page.getByLabel("报名截止").fill("2026-09-19T23:59");
  await page.getByLabel("摘要").fill("验证管理端发布与用户端报名审核联动。");
  await page.getByLabel("活动内容").fill("参与联动验收的成员");
  await page.getByLabel("活动流程").fill("发布\n报名\n审核");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "activity-cover.png",
    mimeType: "image/png",
    buffer: Buffer.from("activity-cover"),
  });
  await page.getByLabel("替代文本").first().fill("端到端活动封面");
  await page.getByRole("button", { name: "保存草稿" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/admin\/activities\/activity-/);
  await expect(page.getByRole("status")).toContainText("草稿已保存");
  await page.getByRole("button", { name: "直接发布" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/activities");

  const activitySlug = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("baiyun-hsd.activities") ?? "{}");
    return state.activities.find((item: { title?: string; publishedState?: string }) => item.title === "端到端活动闭环验证" && item.publishedState === "published")?.slug;
  });
  if (!activitySlug) throw new Error("activity slug was not persisted");
  await signIn(page, "demo-member", `/activities/${encodeURIComponent(activitySlug)}`);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "端到端活动闭环验证" })).toBeVisible();
  await page.getByRole("link", { name: "立即报名", exact: true }).first().click();
  await expect(page.getByRole("status")).toContainText("报名已提交");

  await signIn(page, "admin-alliance", "/admin/activities/registrations");
  await expect(page.getByRole("row", { name: /端到端活动闭环验证/ })).toContainText("待审核");
  await page.getByRole("row", { name: /端到端活动闭环验证/ }).getByRole("button", { name: "录取", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("报名已录取");
});

test("owner can publish a gallery and the public detail renders its snapshot", async ({ page }) => {
  await signIn(page, "admin-alliance", "/admin/gallery/new");
  await page.getByLabel("标题").fill("端到端画廊闭环验证");
  await page.getByLabel("摘要").fill("验证画廊编辑、发布与用户端渲染联动。");
  await page.getByLabel("制作团队").fill("新媒体中心 · 验收组");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "gallery-image.png",
    mimeType: "image/png",
    buffer: Buffer.from("gallery-image"),
  });
  await page.getByLabel("标题").nth(1).fill("验收现场");
  await page.getByLabel("说明").fill("画廊发布后的现场记录。");
  await page.getByLabel("替代文本").fill("画廊验收现场");
  await page.getByRole("button", { name: "保存草稿" }).click();
  await expect(page.getByRole("status")).toContainText("画廊草稿已保存");
  await page.getByRole("button", { name: "直接发布" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/gallery");

  const gallerySlug = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("baiyun-hsd.gallery") ?? "{}");
    return state.albums.find((item: { title?: string; publishedState?: string }) => item.title === "端到端画廊闭环验证" && item.publishedState === "published")?.slug;
  });
  if (!gallerySlug) throw new Error("gallery slug was not persisted");
  await page.goto(`/gallery/${encodeURIComponent(gallerySlug)}`);
  await expect(page.getByRole("heading", { level: 1, name: "端到端画廊闭环验证" })).toBeVisible();
  await expect(page.getByTestId("gallery-media")).toHaveCount(1);
});
