import { expect, test } from "@playwright/test";

const apiBase = process.env.NUXT_PUBLIC_API_BASE ?? "http://127.0.0.1:3001";

function requiredE2eCredential(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required real E2E credential: ${name}`);
  }
  return value;
}

const e2eCredentials = {
  owner: {
    account: requiredE2eCredential("HSD_E2E_OWNER_ACCOUNT"),
    password: requiredE2eCredential("HSD_E2E_OWNER_PASSWORD"),
  },
  admin: {
    account: requiredE2eCredential("HSD_E2E_ADMIN_ACCOUNT"),
    password: requiredE2eCredential("HSD_E2E_ADMIN_PASSWORD"),
  },
};

async function signInAs(page: import("@playwright/test").Page, account: string, password: string) {
  await page.goto("/login?mode=admin&redirect=%2Fadmin");
  await page.locator('input[autocomplete="username"]').fill(account);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  const submit = page.locator('button[type="submit"]');
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/admin");
}

test.describe("real Nuxt + NestJS integration", () => {
  test("public homepage renders the live published portal without Mock fixtures", async ({ page }) => {
    const portalResponse = await page.request.get(`${apiBase}/api/v1/public/portal`);
    expect(portalResponse.ok()).toBe(true);
    const portal = await portalResponse.json() as { entries: Array<{ content: { title: string } }> };
    expect(portal.entries.length).toBeGreaterThan(0);

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/HSD/);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByText(portal.entries[0]!.content.title, { exact: true }).first()).toBeVisible();
  });

  test("homepage reports an invalid portal response instead of showing empty placeholders", async ({ page }) => {
    await page.route("**/api/v1/public/portal", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        publishedAt: "2026-08-17T00:00:00.000Z",
        entries: [{
          slot: "projects",
          position: 1,
          content: { slug: "invalid-project", title: "Invalid project", displayOrder: "wrong" },
        }],
      }),
    }));

    await page.goto("/");
    await expect(page.locator('main [role="status"]').first()).toBeVisible();
    expect(await page.locator('main [role="status"]').count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByText("Invalid project", { exact: true })).toHaveCount(0);
  });

  test("homepage renders live project, activity, and gallery slots with real media", async ({ page }) => {
    const portalResponse = await page.request.get(`${apiBase}/api/v1/public/portal`);
    expect(portalResponse.ok()).toBe(true);
    const portal = await portalResponse.json() as {
      entries: Array<{ slot: string; position: number; content: { title: string } }>;
    };
    const entries = portal.entries.slice().sort((left, right) => left.position - right.position);
    const projects = entries.filter((entry) => entry.slot === "projects");
    const activities = entries.filter((entry) => entry.slot === "activities");
    const gallery = entries.filter((entry) => entry.slot === "gallery");

    await page.goto("/");
    await expect(page.locator(".featured-project")).toHaveCount(1);
    await expect(page.locator(".project-list > a")).toHaveCount(projects.length - 1);
    await expect(page.locator(".activities-list .activity-row")).toHaveCount(activities.length);
    await expect(page.locator('[data-testid="homepage-activity-media"]')).toHaveCount(activities.length);
    await expect(page.locator(".gallery-grid--portal > a")).toHaveCount(gallery.length);
    await expect(page.locator(".featured-project h3")).toHaveText(projects[0]!.content.title);

    const featuredImage = page.locator(".featured-project img").first();
    await featuredImage.scrollIntoViewIfNeeded();
    await expect.poll(() => featuredImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const galleryImage = page.locator(".gallery-grid--portal img").first();
    await galleryImage.scrollIntoViewIfNeeded();
    await expect.poll(() => galleryImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const activityImages = page.locator('[data-testid="homepage-activity-media"] img');
    await expect(activityImages).toHaveCount(activities.length);
    await expect.poll(() => activityImages.first().evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });

  test("owner has dashboard and portal API capabilities", async ({ page }) => {
    await signInAs(page, e2eCredentials.owner.account, e2eCredentials.owner.password);
    await expect(page.locator("main h1")).toBeVisible();
    const ownerBoundary = await page.evaluate(async (base) => {
      const dashboard = await fetch(`${base}/api/v1/admin/dashboard`, { credentials: "include" });
      const portal = await fetch(`${base}/api/v1/admin/portal/configuration/draft`, { credentials: "include" });
      return { dashboard: { status: dashboard.status, body: await dashboard.json() }, portal: portal.status };
    }, apiBase);
    expect(ownerBoundary.dashboard.status).toBe(200);
    expect(ownerBoundary.dashboard.body.operator.capabilities).toEqual(expect.any(Array));
    expect(ownerBoundary.dashboard.body.operator.capabilities.length).toBeGreaterThan(0);
    expect(ownerBoundary.portal).toBe(200);

    await page.goto("/admin/content/home");
    await expect(page).not.toHaveURL(/\/admin\/forbidden/);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main button").first()).toBeVisible();
  });

  test("center administrator has dashboard access but no portal capability", async ({ page }) => {
    await signInAs(page, e2eCredentials.admin.account, e2eCredentials.admin.password);
    await expect(page.locator("main h1")).toBeVisible();
    const centerBoundary = await page.evaluate(async (base) => {
      const dashboard = await fetch(`${base}/api/v1/admin/dashboard`, { credentials: "include" });
      const portal = await fetch(`${base}/api/v1/admin/portal/configuration/draft`, { credentials: "include" });
      return { dashboard: { status: dashboard.status, body: await dashboard.json() }, portal: portal.status };
    }, apiBase);
    expect(centerBoundary.dashboard.status).toBe(200);
    expect(centerBoundary.dashboard.body.operator.capabilities).toEqual(expect.any(Array));
    expect(centerBoundary.portal).toBe(403);

    await page.goto("/admin/content/home");
    await expect(page).toHaveURL(/\/admin\/forbidden\?from=\/admin\/content\/home/);
  });

  test("public activity and gallery media resolve against the API origin", async ({ page }) => {
    const escapedApiBase = apiBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await page.goto("/gallery");
    const galleryImage = page.locator("#gallery-results img").first();
    await expect(galleryImage).toHaveAttribute("src", new RegExp(`^${escapedApiBase}/api/v1/public/media/`));
    await expect.poll(() => galleryImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.goto("/activities");
    const activityImage = page.locator('[data-testid="public-timeline-item"] img').first();
    await expect(activityImage).toHaveAttribute("src", new RegExp(`^${escapedApiBase}/api/v1/public/media/`));
    await expect.poll(() => activityImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByText(/API_RESPONSE_CONTRACT_MISMATCH/)).toHaveCount(0);
  });

  test("deep-linked gallery details rehydrate the published API projection", async ({ page }) => {
    const response = await page.request.get(`${apiBase}/api/v1/public/galleries`);
    expect(response.ok()).toBe(true);
    const galleryHref = `/gallery/${(await response.json()).items[0].slug}`;
    await page.goto(galleryHref, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    await expect(page.locator("main.gallery-detail h1")).toBeVisible();
    await expect(page.locator('[data-testid="gallery-media"]').first()).toBeVisible();
  });

  test("activity and member directories retain live data through client hydration", async ({ page }) => {
    const [activitiesResponse, coreResponse, membersResponse] = await Promise.all([
      page.request.get(`${apiBase}/api/v1/public/activities`),
      page.request.get(`${apiBase}/api/v1/public/core-members`),
      page.request.get(`${apiBase}/api/v1/public/members`),
    ]);
    expect(activitiesResponse.ok()).toBe(true);
    expect(coreResponse.ok()).toBe(true);
    expect(membersResponse.ok()).toBe(true);
    const activities = await activitiesResponse.json() as { items: Array<{ title: string }> };
    const coreMembers = await coreResponse.json() as { items: Array<{ name: string }> };
    const members = await membersResponse.json() as { items: Array<{ name: string }> };
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });

    await page.goto("/activities");
    await expect(page.getByTestId("public-timeline-item")).toHaveCount(activities.items.length);
    await page.goto("/");
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator('[data-testid="homepage-activity-media"]')).not.toHaveCount(0);

    await page.goto("/about");
    const displayedCoreNames = await page.locator(".core-team h3").allTextContents();
    const displayedMemberNames = await page.locator(".member-directory h3").allTextContents();
    expect(displayedCoreNames).not.toHaveLength(0);
    expect(displayedCoreNames.every((name) => coreMembers.items.some((member) => member.name === name))).toBe(true);
    expect(displayedMemberNames).not.toHaveLength(0);
    expect(displayedMemberNames.every((name) => members.items.some((member) => member.name === name))).toBe(true);

    await page.goto("/people/core");
    const coreDirectoryNames = await page.locator(".directory-card h2").allTextContents();
    expect(coreDirectoryNames).not.toHaveLength(0);
    expect(coreDirectoryNames.every((name) => coreMembers.items.some((member) => member.name === name))).toBe(true);
    await page.goto("/people/members");
    const memberDirectoryNames = await page.locator(".people-member-card h2").allTextContents();
    expect(memberDirectoryNames).not.toHaveLength(0);
    expect(memberDirectoryNames.every((name) => members.items.some((member) => member.name === name))).toBe(true);

    expect(browserErrors.filter((message) => message.includes("Hydration") || message.includes("insertBefore"))).toEqual([]);
  });
});
