import { expect, test } from "@playwright/test";

const apiBase = process.env.NUXT_PUBLIC_API_BASE ?? "http://127.0.0.1:3001";

test.describe("Baize real project publication", () => {
  test("public API exposes six ordered projects with names-only members", async ({ request }) => {
    const response = await request.get(`${apiBase}/api/v1/public/projects`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json() as { items: Array<Record<string, any>> };
    expect(body.items.map((item) => item.slug)).toEqual([
      "zhixun-xianfeng",
      "deepseek-study",
      "xiaobaiyun",
      "zhilv-smart-care",
      "ai-pet-care",
      "harmonyos-agri-trace",
    ]);
    expect(body.items).toHaveLength(6);
    for (const project of body.items) {
      expect(project.members.every((member: Record<string, unknown>) => Object.keys(member).every((key) => key === "name"))).toBeTruthy();
      expect(project).not.toHaveProperty("technologies");
      expect(project).not.toHaveProperty("memberPersonIds");
      expect(JSON.stringify(project)).not.toMatch(/202[45]\d{8}|class|contact|personId|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
      expect(String(project.cover?.url ?? "")).not.toMatch(/\.gif/i);
    }
  });

  test("project catalog and detail pages render the API-backed publication", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "networkidle" });
    await expect(page.getByText("智巡先锋", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("DeepSeek-Study 智学领航", { exact: true }).first()).toBeVisible();

    await page.goto("/projects/zhixun-xianfeng", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "智巡先锋", exact: true })).toBeVisible();
    await expect(page.getByText("刘璇", { exact: true })).toBeVisible();
    await expect(page.locator("img").first()).toHaveAttribute("src", /\/api\/v1\/public\/media\//);
    await expect.poll(() => page.locator("img").first().evaluate((image) => getComputedStyle(image).objectFit)).toBe("contain");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });

  test("project detail media keeps portrait and landscape assets complete", async ({ page }) => {
    await page.goto("/projects/deepseek-study", { waitUntil: "networkidle" });
    const media = page.locator(".project-detail-media img");
    await expect(media).not.toHaveCount(0);
    await expect.poll(() => media.first().evaluate((image) => getComputedStyle(image).objectFit)).toBe("contain");
    await expect.poll(() => media.first().evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });

  test("homepage project slot features 智巡先锋", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText("智巡先锋", { exact: true }).first()).toBeVisible();
  });
});
