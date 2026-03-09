import { test, expect } from "@playwright/test";
import { assertNoRuntimeIssues, attachRuntimeIssueCollector } from "./helpers/app.js";

test("types catalog supports search, group filter and transitions to type pages", async ({ page }) => {
  const runtimeIssues = attachRuntimeIssueCollector(page);

  await page.goto("/types/", { waitUntil: "networkidle" });

  await page.getByRole("searchbox", { name: "Быстрый поиск по типу" }).fill("INTJ");
  await expect(page.locator("[data-types-grid] .card")).toHaveCount(1);
  await expect(page.locator("[data-types-summary]")).toContainText("Показано 1");

  const intjCard = page.locator("[data-types-grid] .card").first();
  await expect(intjCard).toContainText("INTJ");
  await intjCard.getByRole("link", { name: "Открыть страницу" }).click();

  await expect(page).toHaveURL(/\/types\/intj\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("INTJ");

  await page.goto("/types/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Diplomats" }).click();
  await expect(page.locator("[data-types-summary]")).toContainText("Diplomats");
  await expect(page.locator("[data-types-grid] .card")).toHaveCount(4);

  await page.getByRole("searchbox", { name: "Быстрый поиск по типу" }).fill("Медиатор");
  await expect(page.locator("[data-types-grid] .card")).toHaveCount(1);

  await page.goto("/groups/", { waitUntil: "networkidle" });
  await page.locator('a[href="/types/enfp/"]').first().click();
  await expect(page).toHaveURL(/\/types\/enfp\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ENFP");

  await assertNoRuntimeIssues(runtimeIssues);
});
