import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import {
  attachRuntimeIssueCollector,
  collectLayoutDiagnostics,
  seedResultState,
} from "../tests/e2e/helpers/app.js";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = path.resolve("screenshots/generated");

const pages = [
  { slug: "home", path: "/" },
  { slug: "auth", path: "/auth/" },
  { slug: "test", path: "/test/", requiresAuth: true },
  { slug: "result", path: "/result/", requiresAuth: true },
  { slug: "types", path: "/types/" },
  { slug: "groups", path: "/groups/" },
  { slug: "type-template", path: "/types/template/" },
  { slug: "type-intj", path: "/types/intj/" },
  { slug: "chat", path: "/chat/" }
];

const viewports = [
  { width: 360, height: 800 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

export async function runVisualCheck() {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const issues = [];

  try {
    for (const pageConfig of pages) {
      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport });
        const runtimeIssues = attachRuntimeIssueCollector(page);

        if (pageConfig.requiresAuth) {
          await seedResultState(page, pageConfig.slug);
        }

        await page.goto(new URL(pageConfig.path, baseUrl).toString(), {
          waitUntil: "networkidle",
        });

        await page.evaluate(async () => {
          if ("fonts" in document) {
            await document.fonts.ready;
          }
        });
        await page.waitForTimeout(250);

        const diagnostics = await collectLayoutDiagnostics(page);

        const screenshotPath = path.join(
          outputDir,
          `${pageConfig.slug}-${viewport.width}x${viewport.height}.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });

        if (diagnostics.scrollWidth > diagnostics.innerWidth + 1) {
          issues.push(
            `${pageConfig.path} @ ${viewport.width}px: scrollWidth=${diagnostics.scrollWidth}, ` +
              `innerWidth=${diagnostics.innerWidth}, elements=${JSON.stringify(
                diagnostics.overflowingElements,
              )}`,
          );
        }

        if (!diagnostics.hasHeading || diagnostics.mainTextLength < 40) {
          issues.push(
            `${pageConfig.path} @ ${viewport.width}px: page content looks incomplete ` +
              `(hasHeading=${diagnostics.hasHeading}, mainTextLength=${diagnostics.mainTextLength})`,
          );
        }

        if (diagnostics.clippedElements.length > 0) {
          issues.push(
            `${pageConfig.path} @ ${viewport.width}px: clipped elements=${JSON.stringify(
              diagnostics.clippedElements,
            )}`,
          );
        }

        if (diagnostics.overlappingPairs.length > 0) {
          issues.push(
            `${pageConfig.path} @ ${viewport.width}px: overlapping elements=${JSON.stringify(
              diagnostics.overlappingPairs,
            )}`,
          );
        }

        if (runtimeIssues.length > 0) {
          issues.push(`${pageConfig.path} @ ${viewport.width}px: ${runtimeIssues.join(" | ")}`);
        }

        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (issues.length > 0) {
    throw new Error(`Visual overflow issues found:\n${issues.join("\n")}`);
  }

  console.log("Visual checks passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runVisualCheck().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
