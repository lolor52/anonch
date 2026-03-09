import { createAuthManager } from "../features/auth/auth-manager.js";
import { getAuthMessage, redirectAfterAuth, resolveRedirectTarget } from "../features/auth/page-guard.js";

const pageHost = document.querySelector("[data-auth-page]");
const authManager = createAuthManager();

const state = {
  activeTab: new URL(window.location.href).searchParams.get("mode") === "register" ? "register" : "login",
  message: null,
  messageKind: "info",
  currentUser: null,
  redirectTarget: resolveRedirectTarget("/test/"),
};

if (pageHost) {
  initAuthPage();
}

function initAuthPage() {
  try {
    state.currentUser = authManager.restoreSession();
  } catch (error) {
    console.error("[auth] Не удалось восстановить сессию на странице входа.", error);
    state.message = "Не удалось прочитать локальные данные профиля. Проверьте localStorage и попробуйте снова.";
    state.messageKind = "error";
  }

  const initialMessageCode = new URL(window.location.href).searchParams.get("message");
  const initialMessage = getAuthMessage(initialMessageCode);

  if (initialMessage) {
    state.message = initialMessage;
    state.messageKind = initialMessageCode === "signed-out" ? "info" : "error";
  }

  render();
  window.addEventListener("auth:changed", handleAuthChanged);
}

function handleAuthChanged(event) {
  state.currentUser = event.detail?.user ?? null;
  render();
}

function render() {
  const providerStatuses = authManager.listProviderStatuses();
  const statusMarkup = state.message
    ? `<div class="auth-message auth-message--${state.messageKind}" role="status">${state.message}</div>`
    : "";
  const sideMarkup = renderSide(providerStatuses);

  pageHost.innerHTML = `
    <section class="section hero">
      <div class="container-wide hero-grid auth-hero">
        <div class="stack-lg">
          <span class="eyebrow">Локальная авторизация</span>
          <div class="stack">
            <h1>Войти, сохранить сессию и продолжить тест без backend.</h1>
            <p class="lead">
              Профиль живёт в браузере. Для внешних провайдеров уже есть единый слой и безопасный mock-режим,
              а в localStorage сохраняются только локальный профиль и состояние авторизации.
            </p>
          </div>
          <div class="cluster">
            <span class="badge">localStorage session</span>
            <span class="badge badge--warm">VK ID ${findProviderMode(providerStatuses, "vk")}</span>
            <span class="badge badge--soft">Yandex ID ${findProviderMode(providerStatuses, "yandex")}</span>
          </div>
        </div>

        <article class="card card--contrast auth-hero-note">
          <span class="badge badge--warm">Что сохраняется</span>
          <h2 class="card-title">Только локальный профиль и флаг входа.</h2>
          <p>
            Внешние токены не хранятся. После успешного входа любой сценарий приводится к одному профилю:
            логин, имя, провайдер, аватар и будущий результат MBTI.
          </p>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="container auth-layout">
        <article class="card card--soft auth-entry">
          ${statusMarkup}
          ${state.currentUser ? renderCurrentUser(state.currentUser) : renderGuestView(providerStatuses)}
        </article>

        <aside class="auth-side">
          ${sideMarkup}
        </aside>
      </div>
    </section>
  `;

  bindEvents();
}

function renderGuestView(providerStatuses) {
  const localProvider = providerStatuses.find((provider) => provider.key === "local");

  return `
    <div class="stack">
      <span class="badge">Варианты входа</span>
      <h2 class="card-title">Сначала локальный профиль, затем тест и результат.</h2>
      <p class="muted">
        Локальная регистрация и вход уже работают. Внешние провайдеры идут через единый auth-layer и сейчас
        доступны в mock-режиме, пока реальные ключи не заполнены.
      </p>
    </div>

    <div class="tab-list" role="tablist" aria-label="Режим локальной авторизации">
      <button
        class="tab ${state.activeTab === "login" ? "is-active" : ""}"
        id="auth-tab-login"
        role="tab"
        type="button"
        aria-selected="${state.activeTab === "login"}"
        aria-controls="auth-local-panel"
        tabindex="${state.activeTab === "login" ? "0" : "-1"}"
        data-auth-tab="login"
      >
        Вход
      </button>
      <button
        class="tab ${state.activeTab === "register" ? "is-active" : ""}"
        id="auth-tab-register"
        role="tab"
        type="button"
        aria-selected="${state.activeTab === "register"}"
        aria-controls="auth-local-panel"
        tabindex="${state.activeTab === "register" ? "0" : "-1"}"
        data-auth-tab="register"
      >
        Регистрация
      </button>
    </div>

    <div id="auth-local-panel" role="tabpanel" aria-labelledby="auth-tab-${state.activeTab}">
    <form class="auth-form" data-auth-form="${state.activeTab}">
      ${
        state.activeTab === "register"
          ? `
            <label class="field">
              <span class="field-label" id="register-username-label">Логин</span>
              <input
                class="input"
                id="register-username"
                name="username"
                type="text"
                placeholder="Например, alina"
                autocomplete="username"
                aria-labelledby="register-username-label"
                aria-describedby="register-username-hint"
              />
              <span class="field-hint" id="register-username-hint">Без пробелов. Логин должен быть уникальным.</span>
            </label>

            <label class="field">
              <span class="field-label" id="register-display-name-label">Имя в профиле</span>
              <input
                class="input"
                id="register-display-name"
                name="displayName"
                type="text"
                placeholder="Например, Алина"
                autocomplete="name"
                aria-labelledby="register-display-name-label"
                aria-describedby="register-display-name-hint"
              />
              <span class="field-hint" id="register-display-name-hint">Это имя будет видно в шапке и на страницах результата.</span>
            </label>

            <div class="cluster">
              <button class="btn btn--primary" type="submit">Создать профиль</button>
              <span class="badge badge--soft">${localProvider.description}</span>
            </div>
          `
          : `
            <label class="field">
              <span class="field-label" id="login-username-label">Логин</span>
              <input
                class="input"
                id="login-username"
                name="username"
                type="text"
                placeholder="Например, alina"
                autocomplete="username"
                aria-labelledby="login-username-label"
                aria-describedby="login-username-hint"
              />
              <span class="field-hint" id="login-username-hint">Используйте тот же логин, который указали при регистрации.</span>
            </label>

            <div class="cluster">
              <button class="btn btn--primary" type="submit">Войти в профиль</button>
              <a class="btn btn--ghost" href="/types/">Пока посмотреть типы</a>
            </div>
          `
      }
    </form>
    </div>

    <div class="auth-divider">или через внешний провайдер</div>

    <div class="auth-provider-list">
      ${providerStatuses
        .filter((provider) => provider.key !== "local")
        .map(
          (provider) => `
            <button
              class="btn btn--social"
              type="button"
              data-provider-signin="${provider.key}"
              ${provider.mode === "disabled" ? "disabled" : ""}
            >
              <strong>${provider.key === "vk" ? "VK" : "Я"}</strong>
              <span>
                ${provider.label}: ${provider.description}
              </span>
            </button>
          `
        )
        .join("")}
    </div>

    <div class="notice">
      После успешного входа вы попадёте на ${
        state.redirectTarget === "/test/" ? "тест" : "нужную защищённую страницу"
      }.
    </div>
  `;
}

function renderCurrentUser(user) {
  return `
    <div class="stack">
      <span class="badge">Профиль активен</span>
      <h2 class="card-title">Сессия восстановлена и готова к работе.</h2>
      <p class="muted">
        Можно продолжить тест, открыть результат или выйти из локальной сессии. При перезагрузке профиль
        восстановится автоматически, пока вы не нажмёте «Выйти».
      </p>
    </div>

    <div class="auth-profile-grid">
      <article class="card">
        <span class="badge badge--soft">Профиль</span>
        <div class="stack">
          <h3 class="card-title">${user.displayName}</h3>
          <p class="muted">@${user.username}</p>
          <p class="muted">Провайдер: ${getProviderLabel(user.authProvider)}</p>
          <p class="muted">Создан: ${formatDate(user.createdAt)}</p>
          <p class="muted">Обновлён: ${formatDate(user.updatedAt)}</p>
        </div>
      </article>

      <article class="card card--accent">
        <span class="badge badge--warm">Следующий шаг</span>
        <div class="stack">
          <h3 class="card-title">Продолжить после входа</h3>
          <p class="muted">
            Этот профиль уже доступен для защищённых разделов. Можно сразу открыть тест, результат или каталог типов.
          </p>
        </div>
      </article>
    </div>

    <div class="cluster">
      <a class="btn btn--primary" href="${state.redirectTarget}">Продолжить</a>
      <a class="btn btn--secondary" href="/result/">Открыть результат</a>
      <button class="btn btn--ghost" type="button" data-auth-logout>Выйти</button>
    </div>
  `;
}

function renderSide(providerStatuses) {
  return `
    <article class="card">
      <span class="badge badge--soft">Как это работает</span>
      <div class="timeline">
        <div class="timeline-step">
          <strong>1</strong>
          <div class="stack">
            <h3>Профиль</h3>
            <p class="muted">Создаётся единый локальный профиль с именем, логином и провайдером входа.</p>
          </div>
        </div>
        <div class="timeline-step">
          <strong>2</strong>
          <div class="stack">
            <h3>Сессия</h3>
            <p class="muted">В localStorage хранится только флаг входа и id текущего пользователя.</p>
          </div>
        </div>
        <div class="timeline-step">
          <strong>3</strong>
          <div class="stack">
            <h3>Guard</h3>
            <p class="muted">Тест и результат без входа недоступны и сразу ведут обратно на эту страницу.</p>
          </div>
        </div>
      </div>
    </article>

    <article class="card">
      <span class="badge">Провайдеры</span>
      <div class="provider-status-list">
        ${providerStatuses
          .map(
            (provider) => `
              <div class="provider-status">
                <div class="stack">
                  <strong>${provider.label}</strong>
                  <span class="muted">${provider.description}</span>
                </div>
                <span class="badge ${provider.ready ? "badge--soft" : "badge--warm"}">${provider.mode}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </article>

    <div class="auth-summary-grid">
      <article class="card">
        <strong class="stat-value">2</strong>
        <span class="stat-label">защищённые страницы уже закрыты без входа</span>
      </article>
      <article class="card">
        <strong class="stat-value">0</strong>
        <span class="stat-label">долговременных внешних токенов хранится в браузере</span>
      </article>
    </div>
  `;
}

function bindEvents() {
  pageHost.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.authTab;
      state.message = null;
      state.messageKind = "info";
      render();
    });
  });

  const tabList = pageHost.querySelector('[role="tablist"]');

  if (tabList) {
    tabList.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
        return;
      }

      const tabs = [...tabList.querySelectorAll("[data-auth-tab]")];
      const currentIndex = tabs.findIndex((tab) => tab.dataset.authTab === state.activeTab);

      if (currentIndex === -1) {
        return;
      }

      event.preventDefault();

      let nextIndex = currentIndex;

      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }

      tabs[nextIndex].click();
      tabs[nextIndex].focus();
    });
  }

  const activeForm = pageHost.querySelector("[data-auth-form]");

  if (activeForm) {
    activeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(activeForm);

      try {
        if (state.activeTab === "register") {
          authManager.registerLocal({
            username: formData.get("username"),
            displayName: formData.get("displayName"),
          });
        } else {
          authManager.loginLocal({
            username: formData.get("username"),
          });
        }

        state.message = null;
        redirectAfterAuth();
      } catch (error) {
        state.message = error.message;
        state.messageKind = "error";
        render();
      }
    });
  }

  pageHost.querySelectorAll("[data-provider-signin]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await authManager.signInWithProvider(button.dataset.providerSignin);
        state.message = null;
        redirectAfterAuth();
      } catch (error) {
        state.message = error.message;
        state.messageKind = "error";
        render();
      }
    });
  });

  const logoutButton = pageHost.querySelector("[data-auth-logout]");

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      authManager.logout();
      state.message = "Вы вышли из профиля.";
      state.messageKind = "info";
      state.currentUser = null;
      render();
    });
  }
}

function getProviderLabel(providerKey) {
  if (providerKey === "vk") {
    return "VK ID";
  }

  if (providerKey === "yandex") {
    return "Yandex ID";
  }

  return "Локально";
}

function findProviderMode(providerStatuses, providerKey) {
  return providerStatuses.find((provider) => provider.key === providerKey)?.mode ?? "unknown";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
