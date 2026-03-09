import { test, expect } from "@playwright/test";
import {
  assertNoRuntimeIssues,
  attachRuntimeIssueCollector,
  clearLocalState,
  loginLocalUser,
  logoutFromCurrentPage,
  registerLocalUser,
} from "./helpers/app.js";

test("local registration, session restore, logout and login work", async ({ page }) => {
  const runtimeIssues = attachRuntimeIssueCollector(page);

  await clearLocalState(page);
  await registerLocalUser(page, {
    username: "maria",
    displayName: "Мария",
  });

  await expect(page).toHaveURL(/\/test\/(\?question=1)?$/);

  const sessionAfterRegistration = await page.evaluate(() => JSON.parse(localStorage.getItem("mbti.session")));
  expect(sessionAfterRegistration?.isAuthenticated).toBeTruthy();

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText("Страница теста")).toBeVisible();

  await logoutFromCurrentPage(page);
  await expect(page).toHaveURL(/\/auth\/\?redirect=.*message=signed-out/);

  await loginLocalUser(page, "maria");
  await expect(page).toHaveURL(/\/test\/(\?question=1)?$/);

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator(".nav-session-copy strong").first()).toHaveText("Мария");

  await assertNoRuntimeIssues(runtimeIssues);
});

test("external providers degrade safely without real keys and work in mock mode", async ({ page }) => {
  const runtimeIssues = attachRuntimeIssueCollector(page);

  await clearLocalState(page);

  await expect(page.getByText("VK ID работает в mock-режиме без внешних ключей.").first()).toBeVisible();
  await expect(page.getByText("Yandex ID работает в mock-режиме без внешних ключей.").first()).toBeVisible();

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/test/"),
    page.locator('[data-provider-signin="vk"]').click(),
  ]);
  await page.waitForLoadState("networkidle");

  await page.goto("/auth/", { waitUntil: "networkidle" });
  await expect(page.locator(".auth-profile-grid .card .card-title").first()).toContainText("Алина");

  await page.locator("[data-auth-logout]").click();

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/test/"),
    page.locator('[data-provider-signin="yandex"]').click(),
  ]);
  await page.waitForLoadState("networkidle");

  await page.goto("/auth/", { waitUntil: "networkidle" });
  await expect(page.locator(".auth-profile-grid .card .card-title").first()).toContainText("Илья");

  await assertNoRuntimeIssues(runtimeIssues);
});
