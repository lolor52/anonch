import { createAuthManager } from "../features/auth/auth-manager.js";
import { getAuthMessage, redirectAfterAuth, resolveRedirectTarget } from "../features/auth/page-guard.js";

const pageHost = document.querySelector("[data-auth-page]");
const authManager = createAuthManager();

const state = {
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
    state.message = "Не удалось прочитать сохранённый профиль. Попробуйте снова.";
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
          <span class="eyebrow">Вход в профиль</span>
          <div class="stack">
            <h1>Войти, продолжить тест и не потерять свой результат.</h1>
            <p class="lead">
              Сайт запоминает ваш профиль, прогресс теста и итоговый результат прямо в браузере.
              Можно вернуться позже и продолжить с того места, где остановились.
            </p>
          </div>
          <div class="cluster">
            <span class="badge">браузерный профиль</span>
            <span class="badge badge--warm">VK ID</span>
            <span class="badge badge--soft">Yandex ID</span>
          </div>
        </div>

        <article class="card card--contrast auth-hero-note">
          <span class="badge badge--warm">Что запоминается</span>
          <h2 class="card-title">Имя, выбранный способ входа и ваш прогресс.</h2>
          <p>
            Этого достаточно, чтобы позже открыть сайт и сразу вернуться к тесту, результату
            и своему профилю.
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
  const readyProviders = providerStatuses.filter((provider) => provider.ready);
  const hasReadyProviders = readyProviders.length > 0;

  return `
    <div class="stack">
      <span class="badge">Варианты входа</span>
      <h2 class="card-title">Вход доступен только через соцсеть.</h2>
      <p class="muted">
        Выберите VK ID или Yandex ID. После успешного входа сайт создаст браузерный профиль,
        сохранит прогресс и вернёт вас к тесту или нужному разделу.
      </p>
    </div>

    <div class="auth-provider-list">
      ${providerStatuses
        .map(
          (provider) => `
            <button
              class="btn btn--social"
              type="button"
              data-provider-signin="${provider.key}"
              ${!provider.ready ? "disabled" : ""}
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

    ${
      hasReadyProviders
        ? ""
        : '<div class="auth-message auth-message--error" role="status">Сейчас ни один способ входа не настроен. Проверьте конфиг провайдеров.</div>'
    }

    <div class="notice">
      После успешного входа вы попадёте на ${
        state.redirectTarget === "/test/" ? "тест" : "нужный раздел"
      }.
    </div>
  `;
}

function renderCurrentUser(user) {
  return `
    <div class="stack">
      <span class="badge">Профиль активен</span>
      <h2 class="card-title">Вход уже действует и всё готово.</h2>
      <p class="muted">
        Можно продолжить тест, открыть результат или выйти из профиля. После перезагрузки вход
        сохранится, пока вы не нажмёте «Выйти».
      </p>
    </div>

    <div class="auth-profile-grid">
      <article class="card">
        <span class="badge badge--soft">Профиль</span>
        <div class="stack">
          <h3 class="card-title">${user.displayName}</h3>
          <p class="muted">@${user.username}</p>
          <p class="muted">Способ входа: ${getProviderLabel(user.authProvider)}</p>
          <p class="muted">Создан: ${formatDate(user.createdAt)}</p>
          <p class="muted">Обновлён: ${formatDate(user.updatedAt)}</p>
        </div>
      </article>

      <article class="card card--accent">
        <span class="badge badge--warm">Следующий шаг</span>
        <div class="stack">
          <h3 class="card-title">Продолжить после входа</h3>
          <p class="muted">
            Профиль уже готов. Можно сразу открыть тест, результат или каталог типов.
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
      <span class="badge badge--soft">Как это устроено</span>
      <div class="timeline">
        <div class="timeline-step">
          <strong>1</strong>
          <div class="stack">
            <h3>Соцвход</h3>
            <p class="muted">Вы выбираете VK ID или Yandex ID и подтверждаете вход в отдельном окне.</p>
          </div>
        </div>
        <div class="timeline-step">
          <strong>2</strong>
          <div class="stack">
            <h3>Профиль в браузере</h3>
            <p class="muted">Сайт сохраняет только ваш браузерный профиль, прогресс теста и итоговый результат.</p>
          </div>
        </div>
        <div class="timeline-step">
          <strong>3</strong>
          <div class="stack">
            <h3>Доступ</h3>
            <p class="muted">Если открыть тест или результат без входа, сайт сначала попросит выбрать профиль.</p>
          </div>
        </div>
      </div>
    </article>

    <article class="card">
      <span class="badge">Способы входа</span>
      <div class="provider-status-list">
        ${providerStatuses
          .map(
            (provider) => `
              <div class="provider-status">
                <div class="stack">
                  <strong>${provider.label}</strong>
                  <span class="muted">${provider.description}</span>
                </div>
                <span class="badge ${provider.ready ? "badge--soft" : "badge--warm"}">${getProviderStatusLabel(provider)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </article>

    <div class="auth-summary-grid">
      <article class="card">
        <strong class="stat-value">2</strong>
        <span class="stat-label">способа входа доступны на странице</span>
      </article>
      <article class="card">
        <strong class="stat-value">1</strong>
        <span class="stat-label">браузерный профиль хранит ваш прогресс и результат</span>
      </article>
    </div>
  `;
}

function bindEvents() {
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

  return "соцвход";
}

function getProviderStatusLabel(provider) {
  if (provider.mode === "mock") {
    return "Mock";
  }

  return provider.ready ? "Доступно" : "Недоступно";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
