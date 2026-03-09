import { expect } from "@playwright/test";

export function attachRuntimeIssueCollector(page) {
  const runtimeIssues = [];

  page.on("pageerror", (error) => {
    runtimeIssues.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeIssues.push(`console.error: ${message.text()}`);
    }
  });

  return runtimeIssues;
}

export async function assertNoRuntimeIssues(runtimeIssues) {
  expect(runtimeIssues, "На странице не должно быть console.error или pageerror.").toEqual([]);
}

export async function clearLocalState(page) {
  await page.goto("/auth/", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
}

export async function registerLocalUser(page, { username, displayName }) {
  await page.getByRole("tab", { name: "Регистрация" }).click();
  await page.getByRole("textbox", { name: "Логин" }).fill(username);
  await page.getByRole("textbox", { name: "Имя в профиле" }).fill(displayName);

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/test/"),
    page.getByRole("button", { name: "Создать профиль" }).click(),
  ]);
}

export async function loginLocalUser(page, username) {
  await page.getByRole("textbox", { name: "Логин" }).fill(username);

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/test/"),
    page.getByRole("button", { name: "Войти в профиль" }).click(),
  ]);
}

export async function logoutFromCurrentPage(page) {
  await page.getByRole("button", { name: "Выйти" }).first().click();
}

export async function seedResultState(page, slug = "result") {
  await page.addInitScript((currentSlug) => {
    const demoUser = {
      id: "visual_user",
      username: "visual_demo",
      displayName: "Визуальная проверка",
      authProvider: "local",
      avatar: "",
      mbtiResult: null,
      createdAt: "2026-03-09T09:00:00.000Z",
      updatedAt: "2026-03-09T09:00:00.000Z",
    };

    localStorage.setItem("mbti.accounts", JSON.stringify({ [demoUser.id]: demoUser }));
    localStorage.setItem(
      "mbti.session",
      JSON.stringify({
        isAuthenticated: true,
        currentUserId: demoUser.id,
        authProvider: "local",
        lastLoginAt: "2026-03-09T09:00:00.000Z",
      }),
    );

    if (currentSlug === "result") {
      const visualResult = {
        typeCode: "INFP",
        completedAt: "2026-03-09T09:30:00.000Z",
        explanation:
          "Тип INFP собрался из наиболее заметных полюсов I по оси «Энергия» и N по оси «Восприятие», а по оставшимся осям баланс ближе к F по оси «Решения», P по оси «Стиль жизни».",
        axisResults: {
          EI: {
            axis: "EI",
            title: "Энергия",
            letters: { winner: "I", loser: "E" },
            rawScores: { E: 5, I: 9 },
            totalScore: 14,
            winnerScore: 9,
            loserScore: 5,
            confidencePercent: 64,
            differencePercent: 29,
            isTie: false,
            note: "Это заметный перевес: энергия чаще восстанавливается через тишину, внутреннюю сборку и дистанцию.",
          },
          SN: {
            axis: "SN",
            title: "Восприятие",
            letters: { winner: "N", loser: "S" },
            rawScores: { S: 4, N: 10 },
            totalScore: 14,
            winnerScore: 10,
            loserScore: 4,
            confidencePercent: 71,
            differencePercent: 43,
            isTie: false,
            note: "Это выраженный перевес: внимание чаще тянется к идеям, смыслам и общей картине.",
          },
          TF: {
            axis: "TF",
            title: "Решения",
            letters: { winner: "F", loser: "T" },
            rawScores: { T: 6, F: 8 },
            totalScore: 14,
            winnerScore: 8,
            loserScore: 6,
            confidencePercent: 57,
            differencePercent: 14,
            isTie: false,
            note: "Это мягкий перевес: решения чаще проходят через ценности, влияние на людей и живой контекст.",
          },
          JP: {
            axis: "JP",
            title: "Стиль жизни",
            letters: { winner: "P", loser: "J" },
            rawScores: { J: 5, P: 9 },
            totalScore: 14,
            winnerScore: 9,
            loserScore: 5,
            confidencePercent: 64,
            differencePercent: 29,
            isTie: false,
            note: "Это заметный перевес: комфортнее, когда есть пространство для манёвра, гибкость и открытый финал.",
          },
        },
      };

      localStorage.setItem("mbti.results", JSON.stringify({ [demoUser.id]: visualResult }));
      demoUser.mbtiResult = {
        code: "INFP",
        completedAt: visualResult.completedAt,
        confidenceByAxis: {
          EI: 64,
          SN: 71,
          TF: 57,
          JP: 64,
        },
      };
      localStorage.setItem("mbti.accounts", JSON.stringify({ [demoUser.id]: demoUser }));
    }
  }, slug);
}

export async function collectLayoutDiagnostics(page) {
  return page.evaluate(() => {
    function formatSelector(element) {
      const tag = element.tagName.toLowerCase();
      const id = element.id ? `#${element.id}` : "";
      const className =
        typeof element.className === "string" && element.className.trim()
          ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
          : "";

      return `${tag}${id}${className}`;
    }

    const selector = [
      ".site-header",
      ".site-footer",
      "main .card",
      "main .btn",
      "main .input",
      "main .tab",
      "main .answer-option",
      "main .group-type-link",
      "main .notice",
    ].join(", ");

    const elements = Array.from(document.querySelectorAll(selector))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { element, rect };
      })
      .filter(({ rect }) => rect.width > 0 && rect.height > 0);

    const overflowingElements = Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element,
          rect,
          rightOverflow: rect.right - window.innerWidth,
          leftOverflow: rect.left * -1,
        };
      })
      .filter((item) => item.rightOverflow > 1 || item.leftOverflow > 1)
      .slice(0, 8)
      .map(({ element, rightOverflow, leftOverflow }) => ({
        selector: formatSelector(element),
        rightOverflow: Number(rightOverflow.toFixed(2)),
        leftOverflow: Number(leftOverflow.toFixed(2)),
      }));

    const clippedElements = elements
      .filter(({ element, rect }) => {
        const style = window.getComputedStyle(element);
        const overflowXHidden = style.overflowX === "hidden" || style.overflowX === "clip";
        const overflowYHidden = style.overflowY === "hidden" || style.overflowY === "clip";
        const hasWideOverflow = element.scrollWidth - element.clientWidth > 2;
        const hasTallOverflow = element.scrollHeight - element.clientHeight > 2;
        const textLength = (element.textContent ?? "").trim().length;
        const childOverflow = Array.from(element.children).some((child) => {
          const childRect = child.getBoundingClientRect();

          return (
            childRect.width > 0 &&
            childRect.height > 0 &&
            (childRect.left < rect.left - 1 ||
              childRect.right > rect.right + 1 ||
              childRect.top < rect.top - 1 ||
              childRect.bottom > rect.bottom + 1)
          );
        });

        return (
          textLength > 16 &&
          childOverflow &&
          ((overflowXHidden && hasWideOverflow) || (overflowYHidden && hasTallOverflow))
        );
      })
      .slice(0, 8)
      .map(({ element }) => ({
        selector: formatSelector(element),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));

    const overlappingPairs = [];

    for (let index = 0; index < elements.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < elements.length; compareIndex += 1) {
        const left = elements[index];
        const right = elements[compareIndex];

        if (left.element.contains(right.element) || right.element.contains(left.element)) {
          continue;
        }

        const overlapWidth = Math.min(left.rect.right, right.rect.right) - Math.max(left.rect.left, right.rect.left);
        const overlapHeight = Math.min(left.rect.bottom, right.rect.bottom) - Math.max(left.rect.top, right.rect.top);

        if (overlapWidth > 2 && overlapHeight > 2) {
          overlappingPairs.push({
            first: formatSelector(left.element),
            second: formatSelector(right.element),
            overlapWidth: Number(overlapWidth.toFixed(2)),
            overlapHeight: Number(overlapHeight.toFixed(2)),
          });
        }

        if (overlappingPairs.length >= 8) {
          break;
        }
      }

      if (overlappingPairs.length >= 8) {
        break;
      }
    }

    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      overflowingElements,
      clippedElements,
      overlappingPairs,
      hasHeading: Boolean(document.querySelector("main h1")),
      mainTextLength: document.querySelector("main")?.innerText.trim().length ?? 0,
    };
  });
}
