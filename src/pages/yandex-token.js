const pageHost = document.querySelector("[data-yandex-token-page]");

if (pageHost) {
  initYandexTokenPage();
}

function initYandexTokenPage() {
  clearSensitiveUrl();

  if (typeof window.YaSendSuggestToken !== "function") {
    renderState({
      title: "Token-page недоступна.",
      body: "Не удалось загрузить Yandex SDK. Проверьте доступ к сети или переключите Yandex ID в mock-режим.",
      tone: "error",
    });
    return;
  }

  try {
    window.YaSendSuggestToken(window.location.origin, { provider: "yandex" });

    renderState({
      title: "Токен передан в основное окно.",
      body: "Если окно не закрылось автоматически, его можно закрыть вручную.",
      tone: "info",
    });

    window.setTimeout(() => {
      window.close();
    }, 150);
  } catch (error) {
    renderState({
      title: "Не удалось передать токен.",
      body: error instanceof Error ? error.message : "Yandex token-page завершилась с ошибкой.",
      tone: "error",
    });
  }
}

function clearSensitiveUrl() {
  history.replaceState({}, document.title, window.location.pathname);
}

function renderState({ title, body, tone }) {
  pageHost.innerHTML = `
    <span class="badge ${tone === "error" ? "badge--warm" : "badge--soft"}">Yandex token-page</span>
    <h1 class="card-title">${title}</h1>
    <p class="muted">${body}</p>
    <a class="btn btn--secondary btn--sm" href="/auth/">Вернуться к входу</a>
  `;
}
