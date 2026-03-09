import { createAuthManager } from "./auth-manager.js";
import { getAuthMessage, isProtectedRoute, redirectToAuth } from "./page-guard.js";

const authManager = createAuthManager();
const DEFAULT_REDIRECT_TARGET = "/test/";

const state = {
  isOpen: false,
  currentUser: null,
  message: "",
  messageKind: "info",
  redirectTarget: DEFAULT_REDIRECT_TARGET,
  returnFocus: null,
};

let host = null;

export function initAuthModal() {
  if (typeof document === "undefined") {
    return;
  }

  if (!host) {
    host = document.createElement("div");
    host.setAttribute("data-auth-modal-host", "");
    document.body.append(host);
    host.addEventListener("click", handleHostClick);
    document.addEventListener("keydown", handleDocumentKeydown);
    window.addEventListener("auth:changed", handleAuthChanged);
  }

  syncCurrentUser();
  render();
  openFromUrlIfNeeded();
}

export function openAuthModal(options = {}) {
  syncCurrentUser();
  state.isOpen = true;
  state.returnFocus = options.returnFocus ?? document.activeElement;
  state.redirectTarget = sanitizeRedirectTarget(options.redirectTarget, getDefaultRedirectTarget());

  if (options.messageCode) {
    state.message = getAuthMessage(options.messageCode);
    state.messageKind = options.messageCode === "signed-out" ? "info" : "error";
  } else if (typeof options.message === "string") {
    state.message = options.message;
    state.messageKind = options.messageKind === "error" ? "error" : "info";
  } else {
    state.message = "";
    state.messageKind = "info";
  }

  render();
  document.body.classList.add("has-auth-modal");
  window.requestAnimationFrame(focusPrimaryControl);
}

export function closeAuthModal({ restoreFocus = true } = {}) {
  if (!state.isOpen) {
    return;
  }

  state.isOpen = false;
  render();
  document.body.classList.remove("has-auth-modal");

  if (restoreFocus && state.returnFocus instanceof HTMLElement) {
    state.returnFocus.focus();
  }
}

function openFromUrlIfNeeded() {
  const currentUrl = new URL(window.location.href);

  if (currentUrl.searchParams.get("auth") !== "modal") {
    return;
  }

  const redirectTarget = sanitizeRedirectTarget(currentUrl.searchParams.get("redirect"), getDefaultRedirectTarget());
  const messageCode = currentUrl.searchParams.get("message") || "";

  currentUrl.searchParams.delete("auth");
  currentUrl.searchParams.delete("redirect");
  currentUrl.searchParams.delete("message");
  history.replaceState({}, document.title, `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);

  openAuthModal({ redirectTarget, messageCode });
}

function syncCurrentUser() {
  try {
    state.currentUser = authManager.restoreSession();
  } catch (error) {
    console.error("[auth] Не удалось восстановить сессию в окне входа.", error);
    state.currentUser = null;
    state.message = "Не удалось прочитать сохранённый профиль. Попробуйте снова.";
    state.messageKind = "error";
  }
}

function handleAuthChanged(event) {
  state.currentUser = event.detail?.user ?? null;
  render();
}

function handleDocumentKeydown(event) {
  if (!state.isOpen || event.key !== "Escape") {
    return;
  }

  closeAuthModal();
}

function handleHostClick(event) {
  const closeTrigger = event.target.closest("[data-auth-modal-close]");

  if (closeTrigger) {
    closeAuthModal();
    return;
  }

  const signInTrigger = event.target.closest("[data-auth-modal-signin]");

  if (signInTrigger) {
    signInWithProvider(signInTrigger.dataset.authModalSignin, signInTrigger);
    return;
  }

  const logoutTrigger = event.target.closest("[data-auth-modal-logout]");

  if (logoutTrigger) {
    handleLogout();
    return;
  }

  const continueTrigger = event.target.closest("[data-auth-modal-continue]");

  if (continueTrigger) {
    event.preventDefault();
    navigateAfterAuth();
  }
}

async function signInWithProvider(providerKey, trigger) {
  try {
    trigger?.setAttribute("disabled", "disabled");
    await authManager.signInWithProvider(providerKey);
    state.message = "";
    navigateAfterAuth();
  } catch (error) {
    state.message = error.message;
    state.messageKind = "error";
    render();
  } finally {
    trigger?.removeAttribute("disabled");
  }
}

function handleLogout() {
  authManager.logout();

  if (isProtectedRoute()) {
    redirectToAuth("signed-out");
    return;
  }

  state.currentUser = null;
  state.message = "Вы вышли из профиля.";
  state.messageKind = "info";
  render();
}

function navigateAfterAuth() {
  const target = sanitizeRedirectTarget(state.redirectTarget, DEFAULT_REDIRECT_TARGET);
  closeAuthModal({ restoreFocus: false });

  if (target === `${normalizePath(window.location.pathname)}${window.location.search}`) {
    return;
  }

  window.location.assign(target);
}

function render() {
  if (!host) {
    return;
  }

  if (!state.isOpen) {
    host.innerHTML = "";
    return;
  }

  const providerStatuses = authManager.listProviderStatuses();
  const messageMarkup = state.message
    ? `<div class="auth-message auth-message--${state.messageKind}" role="status">${state.message}</div>`
    : "";

  host.innerHTML = `
    <div class="auth-modal-shell">
      <button class="auth-modal-backdrop" type="button" aria-label="Закрыть окно входа" data-auth-modal-close></button>
      <section class="auth-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <button class="auth-modal-close" type="button" aria-label="Закрыть" data-auth-modal-close>
          <span aria-hidden="true">×</span>
        </button>
        <div class="auth-modal-layout">
          <div class="auth-modal-main">
            ${messageMarkup}
            ${state.currentUser ? renderCurrentUser() : renderGuestView(providerStatuses)}
          </div>
          <aside class="auth-modal-side">
            ${renderAside(providerStatuses)}
          </aside>
        </div>
      </section>
    </div>
  `;
}

function renderGuestView(providerStatuses) {
  const hasReadyProviders = providerStatuses.some((provider) => provider.ready);

  return `
    <div class="auth-modal-copy">
      <span class="badge badge--warm">Вход в профиль</span>
      <h2 class="card-title" id="auth-modal-title">Войти через VK ID или Yandex ID</h2>
      <p class="muted">
        Вход открывается в отдельном окне провайдера. После подтверждения сайт сохранит только локальный профиль,
        прогресс теста и личный результат в браузере.
      </p>
    </div>
    <div class="auth-modal-provider-list">
      ${providerStatuses
        .map(
          (provider) => `
            <button
              class="btn btn--social auth-modal-provider"
              type="button"
              data-auth-modal-signin="${provider.key}"
              ${provider.ready ? "" : "disabled"}
            >
              <strong>${provider.key === "vk" ? "VK" : "Я"}</strong>
              <span>${provider.label}: ${provider.description}</span>
            </button>
          `
        )
        .join("")}
    </div>
    ${
      hasReadyProviders
        ? `<div class="notice">После входа откроется ${getRedirectTargetLabel(state.redirectTarget)}.</div>`
        : '<div class="auth-message auth-message--error" role="status">Реальный вход пока не запустится: сначала заполните обязательные поля провайдеров в конфиге.</div>'
    }
  `;
}

function renderCurrentUser() {
  return `
    <div class="auth-modal-copy">
      <span class="badge badge--soft">Профиль активен</span>
      <h2 class="card-title" id="auth-modal-title">Вход уже выполнен</h2>
      <p class="muted">Можно продолжить работу без повторной авторизации или выйти из текущего профиля.</p>
    </div>
    <article class="card card--soft auth-modal-profile-card">
      <div class="auth-modal-profile-head">
        <span class="nav-session-mark" aria-hidden="true">${state.currentUser.displayName.slice(0, 1).toUpperCase()}</span>
        <div class="stack">
          <strong>${state.currentUser.displayName}</strong>
          <span class="muted">@${state.currentUser.username} · ${getProviderLabel(state.currentUser.authProvider)}</span>
        </div>
      </div>
      <p class="muted">Профиль хранится в браузере и привязан к выбранному способу входа.</p>
    </article>
    <div class="cluster">
      <a class="btn btn--primary" href="${state.redirectTarget}" data-auth-modal-continue>Продолжить</a>
      <a class="btn btn--secondary" href="/result/">Открыть результат</a>
      <button class="btn btn--ghost" type="button" data-auth-modal-logout>Выйти</button>
    </div>
  `;
}

function renderAside(providerStatuses) {
  return `
    <article class="card auth-modal-note">
      <span class="badge">Как это работает</span>
      <div class="timeline">
        <div class="timeline-step">
          <strong>1</strong>
          <div class="stack">
            <h3>Выбор провайдера</h3>
            <p class="muted">Сайт открывает безопасное окно VK ID или Yandex ID без внешних SDK.</p>
          </div>
        </div>
        <div class="timeline-step">
          <strong>2</strong>
          <div class="stack">
            <h3>Чтение профиля</h3>
            <p class="muted">После подтверждения читаются только базовые данные профиля, без хранения внешнего токена.</p>
          </div>
        </div>
        <div class="timeline-step">
          <strong>3</strong>
          <div class="stack">
            <h3>Возврат на сайт</h3>
            <p class="muted">Дальше вы возвращаетесь к ${getRedirectTargetLabel(state.redirectTarget)}.</p>
          </div>
        </div>
      </div>
    </article>
    <div class="auth-modal-status-list">
      ${providerStatuses
        .map(
          (provider) => `
            <article class="auth-modal-status">
              <div class="stack">
                <strong>${provider.label}</strong>
                <span class="muted">${provider.description}</span>
              </div>
              <span class="badge ${provider.ready ? "badge--soft" : "badge--warm"}">${provider.ready ? "готов" : "нужна настройка"}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function focusPrimaryControl() {
  const focusTarget = host?.querySelector("[data-auth-modal-signin]:not([disabled]), [data-auth-modal-continue], [data-auth-modal-close]");
  focusTarget?.focus();
}

function getDefaultRedirectTarget() {
  const currentPath = `${normalizePath(window.location.pathname)}${window.location.search}`;
  return window.location.pathname === "/" || normalizePath(window.location.pathname) === "/auth/"
    ? DEFAULT_REDIRECT_TARGET
    : currentPath;
}

function sanitizeRedirectTarget(rawTarget, fallbackTarget) {
  if (!rawTarget) {
    return fallbackTarget;
  }

  if (!rawTarget.startsWith("/") || rawTarget.startsWith("//")) {
    return fallbackTarget;
  }

  return rawTarget;
}

function normalizePath(pathname) {
  const withoutIndex = pathname.replace(/index\.html$/, "");
  return withoutIndex.endsWith("/") ? withoutIndex : `${withoutIndex}/`;
}

function getProviderLabel(providerKey) {
  return providerKey === "vk" ? "VK ID" : providerKey === "yandex" ? "Yandex ID" : "вход";
}

function getRedirectTargetLabel(target) {
  if (target === "/test/") {
    return "тест";
  }

  if (target === "/result/") {
    return "личный результат";
  }

  if (target === "/types/") {
    return "каталог типов";
  }

  return "нужный раздел";
}