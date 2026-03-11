import { createMbtiService } from "../features/mbti/mbti-service.js";

const mbtiService = createMbtiService();
const BRAND_NAME = "АнонЧ";
const pageKey = document.body.dataset.page ?? "";

let currentResult = null;

currentResult = readCurrentResult();

function renderBrand() {
  return `
    <a class="nav-brand" href="/" aria-label="${BRAND_NAME}">
      <span class="nav-brand-mark" aria-hidden="true">
        <img src="/media/logo.png" alt="" width="44" height="44" />
      </span>
      <span class="nav-brand-copy">
        <strong>${BRAND_NAME}</strong>
        <span>тест, типы и совместимость</span>
      </span>
    </a>
  `;
}

function getNavItems() {
  return [
    { key: "home", label: "Главная", href: "/" },
    { key: "test", label: "Тест", href: "/test/" },
    { key: "result", label: "Результат", href: "/result/" },
    { key: "types", label: "Типы", href: "/types/" },
    { key: "groups", label: "Группы", href: "/groups/" },
    { key: "chat", label: "Чат", href: "/chat/" },
  ];
}

function getHeaderAction() {
  if (currentResult && pageKey !== "result") {
    return { href: "/result/", label: "Открыть результат" };
  }

  if (pageKey === "result") {
    return { href: "/types/", label: "Смотреть типы" };
  }

  if (pageKey === "test") {
    return { href: "/types/", label: "Смотреть типы" };
  }

  return { href: "/test/", label: "Пройти тест" };
}

function renderDesktopStatus() {
  return `
    <div class="cluster nav-meta" aria-label="Локальное состояние">
      <span class="badge badge--soft">без регистрации</span>
      <span class="badge ${currentResult ? "badge--warm" : "badge--soft"}">
        ${currentResult ? `сохранён ${currentResult.typeCode}` : "сохраняется в браузере"}
      </span>
    </div>
  `;
}

function renderMobileStatus() {
  return `
    <div class="nav-panel nav-panel--mobile">
      <span class="badge badge--soft">без регистрации</span>
      <span class="badge ${currentResult ? "badge--warm" : "badge--soft"}">
        ${currentResult ? `сохранён ${currentResult.typeCode}` : "сохраняется в браузере"}
      </span>
    </div>
  `;
}

function renderHeader() {
  const host = document.querySelector("[data-shell-header]");

  if (!host) {
    return;
  }

  const navLinks = getNavItems()
    .map(
      (item) => `
        <a
          class="nav-link"
          href="${item.href}"
          ${item.key === pageKey ? 'aria-current="page"' : ""}
        >
          ${item.label}
        </a>
      `
    )
    .join("");
  const headerAction = getHeaderAction();

  host.innerHTML = `
    <header class="site-header">
      <div class="container-wide nav-inner">
        ${renderBrand()}

        <button
          class="menu-toggle"
          type="button"
          aria-expanded="false"
          aria-controls="site-navigation"
          aria-label="Открыть меню"
          data-menu-toggle
        >
          <span class="visually-hidden" data-menu-toggle-label>Открыть меню</span>
          <span class="menu-toggle-icon" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <nav class="site-nav" id="site-navigation" aria-label="Основная навигация" data-site-nav>
          ${navLinks}
          ${renderMobileStatus()}
        </nav>

        <div class="nav-actions">
          ${renderDesktopStatus()}
          <a class="btn btn--primary btn--sm" href="${headerAction.href}">${headerAction.label}</a>
        </div>
      </div>
    </header>
  `;

  syncMenuState(false);
}

function renderFooter() {
  const host = document.querySelector("[data-shell-footer]");

  if (!host) {
    return;
  }

  host.innerHTML = `
    <footer class="site-footer">
      <div class="container-wide footer-grid">
        <div class="footer-column footer-column-brand">
          ${renderBrand()}
        </div>

        <nav class="footer-column footer-column-nav" aria-label="Разделы сайта">
          <p class="footer-title">Разделы</p>
          <div class="footer-links">
            <a href="/test/">Тест MBTI</a>
            <a href="/result/">Страница результата</a>
            <a href="/types/">Все 16 типов</a>
            <a href="/groups/">4 группы</a>
            <a href="/chat/">Страница чата</a>
          </div>
        </nav>
      </div>

      <div class="container-wide footer-bottom">
        <span>© <span data-current-year></span> ${BRAND_NAME}</span>
        <span>Сайт по MBTI: тест, типы и совместимость</span>
      </div>
    </footer>
  `;
}

function getMenuElements() {
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-site-nav]");
  const toggleLabel = document.querySelector("[data-menu-toggle-label]");

  return { toggle, nav, toggleLabel };
}

function isDesktopViewport() {
  return window.matchMedia("(min-width: 64rem)").matches;
}

function syncMenuState(isOpen) {
  const { toggle, nav, toggleLabel } = getMenuElements();

  if (!toggle || !nav) {
    return;
  }

  if (isDesktopViewport()) {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Основная навигация");

    if (toggleLabel) {
      toggleLabel.textContent = "Основная навигация";
    }

    nav.hidden = false;
    nav.classList.remove("is-open");
    return;
  }

  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");

  if (toggleLabel) {
    toggleLabel.textContent = isOpen ? "Закрыть меню" : "Открыть меню";
  }

  nav.hidden = !isOpen;
  nav.classList.toggle("is-open", isOpen);
}

function closeMenu() {
  syncMenuState(false);
}

function toggleMenu() {
  const { toggle } = getMenuElements();

  if (!toggle || isDesktopViewport()) {
    return;
  }

  const isOpen = toggle.getAttribute("aria-expanded") === "true";
  syncMenuState(!isOpen);
}

function setupYear() {
  const yearNode = document.querySelector("[data-current-year]");

  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
}

function refreshShellState() {
  currentResult = readCurrentResult();
  renderHeader();
}

function readCurrentResult() {
  try {
    return mbtiService.getResult();
  } catch (error) {
    console.error("[shell] Не удалось прочитать локальный результат.", error);
    return null;
  }
}

function handleDocumentClick(event) {
  const { nav } = getMenuElements();
  const toggle = event.target.closest("[data-menu-toggle]");

  if (toggle) {
    toggleMenu();
    return;
  }

  if (event.target.closest(".site-nav a")) {
    closeMenu();
    return;
  }

  if (nav && !nav.hidden && !event.target.closest("[data-site-nav]")) {
    closeMenu();
  }
}

function handleDocumentKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  const { nav, toggle } = getMenuElements();

  if (!nav || nav.hidden || isDesktopViewport()) {
    return;
  }

  closeMenu();
  toggle?.focus();
}

function setupInteractions() {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);

  window.addEventListener("resize", () => {
    syncMenuState(false);
  });

  window.addEventListener("storage", refreshShellState);
}

renderHeader();
renderFooter();
setupYear();
setupInteractions();
