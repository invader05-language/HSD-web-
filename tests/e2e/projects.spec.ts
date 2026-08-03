import { expect, test } from "@playwright/test";

test("project category filters show the projects assigned to each category", async ({ page }) => {
  await page.goto("/projects");
  await page.waitForFunction(() => Boolean((document.querySelector("#__nuxt") as HTMLElement & { __vue_app__?: unknown })?.__vue_app__));

  await page.getByRole("button", { name: "校园服务", exact: true }).click();
  await expect(page.getByRole("heading", { name: "小白云", exact: true })).toBeVisible();
  await expect(page.getByText("共 1 个项目", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "HarmonyOS", exact: true }).click();
  await expect(page.getByRole("heading", { name: "智能伴侣", exact: true })).toBeVisible();
  await expect(page.getByText("共 3 个项目", { exact: true })).toBeVisible();
});
