import { getGroupBadgeClass, getTypePath, loadJson, renderNotice } from "../shared/mbti-data.js";

const questionCountNodes = document.querySelectorAll("[data-home-question-count]");
const typeCountNodes = document.querySelectorAll("[data-home-types-count]");
const groupCountNodes = document.querySelectorAll("[data-home-groups-count]");
const groupsHost = document.querySelector("[data-home-groups]");

if (groupsHost) {
  initHome().catch((error) => {
    console.error(error);
    renderNotice(groupsHost, "Не удалось загрузить данные главной страницы.");
  });
}

async function initHome() {
  const [questions, categories, types] = await Promise.all([
    loadJson("questions"),
    loadJson("categories"),
    loadJson("types"),
  ]);

  questionCountNodes.forEach((node) => {
    node.textContent = String(questions.items.length);
  });

  typeCountNodes.forEach((node) => {
    node.textContent = String(types.items.length);
  });

  groupCountNodes.forEach((node) => {
    node.textContent = String(categories.items.length);
  });

  groupsHost.innerHTML = categories.items
    .map(
      (group) => `
        <article class="card group-card">
          <span class="${getGroupBadgeClass(group.code)}">${group.label}</span>
          <h3 class="card-title">${group.title}</h3>
          <p class="muted">${group.idea}</p>
          <div class="pill-list">
            ${group.types
              .map(
                (code) => `
                  <a class="pill" href="${getTypePath(code)}">${code}</a>
                `
              )
              .join("")}
          </div>
          <a class="link-inline" href="/types/?group=${group.code}">Открыть типы группы</a>
        </article>
      `
    )
    .join("");
}
