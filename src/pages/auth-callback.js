const pageHost = document.querySelector("[data-auth-callback-page]");

if (pageHost) {
  initCallbackPage();
}

function initCallbackPage() {
  const payload = readAuthPayload();
  clearSensitiveUrl();

  if (!window.opener) {
    renderState({
      title: "Окно callback открыто отдельно.",
      body: "Вернитесь на страницу входа и запустите VK ID снова из основного окна.",
      tone: "info",
    });
    return;
  }

  window.opener.postMessage(
    {
      source: "mbti-auth-callback",
      provider: "vk",
      ...payload,
    },
    window.location.origin
  );

  if (payload.error) {
    renderState({
      title: "VK ID вернул ошибку.",
      body: payload.errorDescription || payload.error,
      tone: "error",
    });
    return;
  }

  renderState({
    title: "Авторизация VK ID завершена.",
    body: "Окно можно закрыть. Данные уже отправлены в основное приложение.",
    tone: "info",
  });

  window.setTimeout(() => {
    window.close();
  }, 150);
}

function readAuthPayload() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    state: hashParams.get("state") || searchParams.get("state") || "",
    access_token: hashParams.get("access_token") || "",
    expires_in: hashParams.get("expires_in") || "",
    user_id: hashParams.get("user_id") || searchParams.get("user_id") || "",
    email: hashParams.get("email") || searchParams.get("email") || "",
    error: hashParams.get("error") || searchParams.get("error") || "",
    errorDescription:
      hashParams.get("error_description") || searchParams.get("error_description") || "",
  };
}

function clearSensitiveUrl() {
  history.replaceState({}, document.title, window.location.pathname);
}

function renderState({ title, body, tone }) {
  pageHost.innerHTML = `
    <span class="badge ${tone === "error" ? "badge--warm" : "badge--soft"}">VK callback</span>
    <h1 class="card-title">${title}</h1>
    <p class="muted">${body}</p>
    <a class="btn btn--secondary btn--sm" href="/auth/">Вернуться к входу</a>
  `;
}
