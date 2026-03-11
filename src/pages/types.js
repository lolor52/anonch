import {
  getGroupBadgeClass,
  getGroupByCode,
  getTypePath,
  loadJson,
  readSearchParam,
  renderNotice,
} from "../shared/mbti-data.js";
import { createMbtiService } from "../features/mbti/mbti-service.js";

const tabsHost = document.querySelector("[data-types-tabs]");
const gridHost = document.querySelector("[data-types-grid]");
const searchInput = document.querySelector("[data-types-search]");
const summaryHost = document.querySelector("[data-types-summary]");
const mbtiService = createMbtiService();

if (tabsHost && gridHost && searchInput && summaryHost) {
  initTypesPage().catch((error) => {
    console.error(error);
    renderNotice(gridHost, "Не удалось загрузить каталог типов.");
  });
}

async function initTypesPage() {
  const [types, categories] = await Promise.all([loadJson("types"), loadJson("categories")]);
  const currentResult = safeGetCurrentResult();
  const state = {
    query: (readSearchParam("q") ?? "").trim().toLowerCase(),
    group: readSearchParam("group") ?? "all",
  };

  const groups = [
    { code: "all", label: "Все типы" },
    ...categories.items.map((group) => ({ code: group.code, label: group.label })),
  ];

  searchInput.value = readSearchParam("q") ?? "";

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim().toLowerCase();
    syncUrl(state);
    renderGrid(types, categories, state, currentResult);
  });

  tabsHost.addEventListener("click", (event) => {
    const button = event.target.closest("[data-types-group]");

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    state.group = button.dataset.typesGroup ?? "all";
    renderTabs(groups, state.group);
    syncUrl(state);
    renderGrid(types, categories, state, currentResult);
  });

  tabsHost.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      return;
    }

    const buttons = [...tabsHost.querySelectorAll("[data-types-group]")];
    const currentIndex = buttons.findIndex((button) => button.dataset.typesGroup === state.group);

    if (currentIndex === -1) {
      return;
    }

    event.preventDefault();

    let nextIndex = currentIndex;

    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = buttons.length - 1;
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % buttons.length;
    } else {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    }

    buttons[nextIndex].click();
    buttons[nextIndex].focus();
  });

  if (!groups.some((group) => group.code === state.group)) {
    state.group = "all";
  }

  renderTabs(groups, state.group);
  renderGrid(types, categories, state, currentResult);
}

function renderTabs(groups, activeGroup) {
  tabsHost.innerHTML = groups
    .map(
      (group) => `
        <button
          class="tab ${group.code === activeGroup ? "is-active" : ""}"
          type="button"
          aria-pressed="${group.code === activeGroup}"
          data-types-group="${group.code}"
        >
          ${group.label}
        </button>
      `
    )
    .join("");
}

function renderGrid(types, categories, state, currentResult) {
  const itemsByCode = new Map(types.items.map((type) => [type.code, type]));
  const orderedTypes = (types.order ?? []).map((code) => itemsByCode.get(code)).filter(Boolean);
  const source = orderedTypes.length > 0 ? orderedTypes : types.items;
  const filteredTypes = source.filter((type) => {
    const matchesGroup = state.group === "all" || type.group === state.group;
    const haystack = `${type.code} ${type.fullName} ${type.shortDescription}`.toLowerCase();
    const matchesQuery = !state.query || haystack.includes(state.query);

    return matchesGroup && matchesQuery;
  });

  if (filteredTypes.length === 0) {
    summaryHost.textContent =
      state.group === "all"
        ? "Ничего не найдено. Попробуйте изменить запрос."
        : "Ничего не найдено в выбранной группе. Попробуйте снять фильтр.";
    gridHost.innerHTML = `
      <article class="card card--soft directory-empty">
        <h2 class="card-title">По текущему фильтру типы не найдены.</h2>
        <p class="muted">Попробуйте убрать часть запроса или переключиться на другую группу.</p>
      </article>
    `;
    return;
  }

  summaryHost.textContent = `Показано ${filteredTypes.length} из ${source.length} типов${
    state.group === "all" ? "" : ` в группе ${getGroupByCode(categories, state.group)?.label ?? state.group}`
  }.`;

  gridHost.innerHTML = filteredTypes
    .map((type) => {
      const group = getGroupByCode(categories, type.group);
      const isCurrentType = currentResult?.typeCode === type.code;

      return `
        <article class="card">
          <div class="cluster">
            <span class="${getGroupBadgeClass(type.group)}">${type.code}</span>
            ${isCurrentType ? '<span class="badge badge--warm">мой тип</span>' : ""}
          </div>
          <h2 class="card-title">${type.fullName}</h2>
          <p class="muted">${type.shortDescription}</p>
          <p class="type-card-meta subtle">${group?.title ?? ""} / ${group?.label ?? ""}</p>
          <ul class="card-list type-card-list">
            ${type.strengths.slice(0, 2).map((item) => `<li>${item}</li>`).join("")}
          </ul>
          <a class="link-inline" href="${getTypePath(type.code)}">Открыть страницу</a>
        </article>
      `;
    })
    .join("");
}

function syncUrl(state) {
  const url = new URL(window.location.href);

  if (state.group === "all") {
    url.searchParams.delete("group");
  } else {
    url.searchParams.set("group", state.group);
  }

  if (!state.query) {
    url.searchParams.delete("q");
  } else {
    url.searchParams.set("q", state.query);
  }

  history.replaceState({}, document.title, url.pathname + url.search);
}

function safeGetCurrentResult() {
  try {
    return mbtiService.getResult();
  } catch (error) {
    console.error("[types] Не удалось прочитать сохранённый результат.", error);
    return null;
  }
}
