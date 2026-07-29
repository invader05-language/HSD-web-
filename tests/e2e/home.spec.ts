import { expect, test } from "@playwright/test";

test("desktop homepage exposes the approved content sequence", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /鸿蒙启航/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "四大中心，共同完成一件事" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "把想法做成真实项目" })).toBeVisible();
  await expect(page.getByText("智巡先锋", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "由成员记录，也由成员创作" })).toBeVisible();
});

test("public detail remains open and personal signup continues through login", async ({ page }) => {
  await page.goto("/activities/harmonyos-salon");
  await expect(page.getByRole("heading", { name: "HarmonyOS 原生应用入门" })).toBeVisible();

  await page.getByRole("link", { name: "登录后提交报名" }).click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.getByRole("heading", { name: "成员登录" })).toBeVisible();
});

test("desktop routes do not overflow horizontally", async ({ page }) => {
  for (const path of [
    "/",
    "/about",
    "/people/core",
    "/people/members",
    "/centers",
    "/centers/baize-development",
    "/centers/new-media",
    "/centers/tuowei-planning",
    "/centers/talent-development",
    "/projects",
    "/activities",
    "/gallery",
    "/resources",
    "/join",
    "/help"
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `${path} should not overflow horizontally`).toBe(false);
  }
});
