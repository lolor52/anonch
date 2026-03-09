import { test, expect } from "@playwright/test";
import {
  assertNoRuntimeIssues,
  attachRuntimeIssueCollector,
  clearLocalState,
  registerLocalUser,
} from "./helpers/app.js";

test("MBTI flow saves draft, result and supports retake", async ({ page }) => {
  const runtimeIssues = attachRuntimeIssueCollector(page);

  await clearLocalState(page);
  await registerLocalUser(page, {
    username: "mbti_user",
    displayName: "Тестовый Пользователь",
  });

  for (let index = 0; index < 5; index += 1) {
    await page.locator("[data-answer-id]").first().click();
    await page.getByRole("button", { name: "Следующий вопрос" }).click();
  }

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("[data-question-index]")).toContainText("Вопрос 6");

  for (let index = 6; index <= 22; index += 1) {
    await page.locator("[data-answer-id]").first().click();
    await page.getByRole("button", { name: index === 22 ? "Завершить тест" : "Следующий вопрос" }).click();
  }

  await expect(page).toHaveURL(/\/result\/$/);
  await expect(page.locator("[data-result-type]")).not.toBeEmpty();

  const savedState = await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("mbti.session"));
    const results = JSON.parse(localStorage.getItem("mbti.results"));
    const accounts = JSON.parse(localStorage.getItem("mbti.accounts"));

    return {
      session,
      result: results?.[session?.currentUserId] ?? null,
      user: accounts?.[session?.currentUserId] ?? null,
    };
  });

  expect(savedState.result?.typeCode).toBeTruthy();
  expect(savedState.user?.mbtiResult?.code).toBeTruthy();

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("[data-result-type]")).toContainText(savedState.result.typeCode);

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("[data-retake-result]").click();
  await expect(page).toHaveURL(/\/test\/(\?question=1)?$/);
  await expect(page.locator("[data-question-index]")).toContainText("Вопрос 1");

  const resetState = await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("mbti.session"));
    const results = localStorage.getItem("mbti.results");
    const accounts = JSON.parse(localStorage.getItem("mbti.accounts"));

    return {
      results,
      user: accounts?.[session?.currentUserId] ?? null,
    };
  });

  expect(resetState.results).toBeNull();
  expect(resetState.user?.mbtiResult).toBeNull();

  await page.locator("[data-answer-id]").nth(1).click();
  await page.getByRole("button", { name: "Следующий вопрос" }).click();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("[data-question-index]")).toContainText("Вопрос 2");

  await assertNoRuntimeIssues(runtimeIssues);
});
