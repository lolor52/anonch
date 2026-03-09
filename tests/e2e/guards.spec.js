import { test, expect } from "@playwright/test";
import { assertNoRuntimeIssues, attachRuntimeIssueCollector, clearLocalState } from "./helpers/app.js";

test("route guards redirect guest from test and result to auth", async ({ page }) => {
  const runtimeIssues = attachRuntimeIssueCollector(page);

  await clearLocalState(page);

  await page.goto("/test/", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/auth\/\?redirect=%2Ftest%2F.*message=auth-required/);
  await expect(page.getByText("Сначала войдите, чтобы открыть тест и личный результат.")).toBeVisible();

  await page.goto("/result/", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/auth\/\?redirect=%2Fresult%2F.*message=auth-required/);
  await expect(page.getByText("Сначала войдите, чтобы открыть тест и личный результат.")).toBeVisible();

  await assertNoRuntimeIssues(runtimeIssues);
});
