import { getGroupBadgeClass, getTypePath, loadJson, renderNotice } from "../shared/mbti-data.js";

const groupsHost = document.querySelector("[data-groups-grid]");
const guideHost = document.querySelector("[data-groups-guide]");

if (groupsHost && guideHost) {
  initGroupsPage().catch((error) => {
    console.error(error);
    renderNotice(groupsHost, "Не удалось загрузить данные групп.");
  });
}

async function initGroupsPage() {
  const [categories, types, uiCopy] = await Promise.all([loadJson("categories"), loadJson("types"), loadJson("ui-copy")]);
  const typeMap = new Map(types.items.map((type) => [type.code, type]));

  groupsHost.innerHTML = categories.items
    .map(
      (group) => `
        <article class="card group-card">
          <span class="${getGroupBadgeClass(group.code)}">${group.label}</span>
          <h2 class="card-title">${group.title}</h2>
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
          <div class="group-type-links">
            ${group.types
              .map((code) => {
                const type = typeMap.get(code);

                return `
                  <a class="group-type-link" href="${getTypePath(code)}">
                    <strong>${code}</strong>
                    <span>${type?.fullName ?? ""}</span>
                  </a>
                `;
              })
              .join("")}
          </div>
          <a class="link-inline" href="/types/?group=${group.code}">Открыть типы группы</a>
        </article>
      `
    )
    .join("");

  guideHost.innerHTML = uiCopy.groupGuide
    .map(
      (item) => `
        <article class="card">
          <h3 class="card-title">${item.title}</h3>
          <p class="muted">${item.body}</p>
        </article>
      `
    )
    .join("");
}
