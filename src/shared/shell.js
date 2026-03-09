import { createAuthManager } from "../features/auth/auth-manager.js";
import { isProtectedRoute, redirectToAuth } from "../features/auth/page-guard.js";

const authManager = createAuthManager();
const BRAND_NAME = "АнонЧ";
const pageKey = document.body.dataset.page ?? "";

let currentUser = readCurrentUser();

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
    { key: "auth", label: currentUser ? "Аккаунт" : "Вход", href: "/auth/" },
    { key: "test", label: "Тест", href: "/test/" },
    { key: "result", label: "Результат", href: "/result/" },
    { key: "types", label: "Типы", href: "/types/" },
    { key: "groups", label: "Группы", href: "/groups/" },
    { key: "chat", label: "Чат", href: "/chat/" },
  ];
}

function getHeaderAction() {
  if (currentUser) {
    return { href: "/test/", label: "К тесту" };
  }

  return pageKey === "auth" ? { href: "/types/", label: "Смотреть типы" } : { href: "/auth/", label: "Войти" };
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
  const desktopSession = currentUser ? renderUserActions("desktop") : renderGuestActions();
  const mobileSession = currentUser
    ? `<div class="nav-panel nav-panel--mobile">${renderUserActions("mobile")}</div>`
    : `<div class="nav-panel nav-panel--mobile">${renderGuestActions()}</div>`;

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
          ${mobileSession}
        </nav>

        <div class="nav-actions">
          ${desktopSession}
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
        <div class="footer-column">
          ${renderBrand()}
          <p class="muted">
            Спокойный сайт про MBTI: вход, тест, личный результат, каталог типов,
            совместимость и будущий анонимный чат.
          </p>
        </div>

        <div class="footer-column">
          <p class="footer-title">Разделы</p>
          <div class="footer-links">
            <a href="/auth/">Страница входа</a>
            <a href="/test/">Тест MBTI</a>
            <a href="/result/">Страница результата</a>
            <a href="/types/">Все 16 типов</a>
            <a href="/groups/">4 группы</a>
          </div>
        </div>

        <div class="footer-column">
          <p class="footer-title">Статус</p>
          <div class="footer-links">
            <span>Можно войти по имени, а также через VK ID или Yandex ID</span>
            <span>Профиль, ответы теста и результат сохраняются в браузере</span>
            <a href="/chat/">Скоро: анонимный чат по MBTI</a>
          </div>
        </div>
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

function renderUserActions(mode) {
  const providerLabel = getAuthProviderLabel(currentUser.authProvider);
  const logoutClass = mode === "mobile" ? "btn btn--secondary btn--sm nav-logout" : "btn btn--ghost btn--sm";

  return `
    <a class="nav-session" href="/auth/">
      <span class="nav-session-mark" aria-hidden="true">${currentUser.displayName.slice(0, 1).toUpperCase()}</span>
      <span class="nav-session-copy">
        <strong>${currentUser.displayName}</strong>
        <span>@${currentUser.username} · ${providerLabel}</span>
      </span>
    </a>
    <button class="${logoutClass}" type="button" data-logout-trigger>Выйти</button>
  `;
}

function renderGuestActions() {
  return `
    <span class="badge badge--soft">гость</span>
    <a class="btn btn--secondary btn--sm" href="/auth/">Войти</a>
  `;
}

function getAuthProviderLabel(providerKey) {
  if (providerKey === "vk") {
    return "VK ID";
  }

  if (providerKey === "yandex") {
    return "Yandex ID";
  }

  return "свой профиль";
}

function readCurrentUser() {
  try {
    return authManager.restoreSession();
  } catch (error) {
    console.error("[auth] Не удалось прочитать сессию для шапки.", error);
    return null;
  }
}

function refreshHeader() {
  currentUser = readCurrentUser();
  renderHeader();
}

function handleDocumentClick(event) {
  const { nav } = getMenuElements();
  const toggle = event.target.closest("[data-menu-toggle]");

  if (toggle) {
    toggleMenu();
    return;
  }

  const logoutTrigger = event.target.closest("[data-logout-trigger]");

  if (logoutTrigger) {
    authManager.logout();

    if (isProtectedRoute()) {
      redirectToAuth("signed-out");
      return;
    }

    refreshHeader();
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

  window.addEventListener("auth:changed", () => {
    refreshHeader();
  });
}

renderHeader();
renderFooter();
setupYear();
setupInteractions();
