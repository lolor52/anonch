const pageHost = document.querySelector("[data-auth-callback-page]");
const PROVIDER_DETAILS = {
  vk: {
    label: "VK ID",
    badge: "VK ID",
  },
  yandex: {
    label: "Yandex ID",
    badge: "Yandex ID",
  },
};

if (pageHost) {
  initCallbackPage();
}

function initCallbackPage() {
  const providerKey = resolveProviderKey();
  const providerDetails = PROVIDER_DETAILS[providerKey] ?? {
    label: "вход",
    badge: "Подтверждение",
  };
  const payload = readAuthPayload();
  clearSensitiveUrl();

  if (!window.opener) {
    renderState({
      title: "Окно входа открыто отдельно.",
      body: `Вернитесь на страницу входа и запустите ${providerDetails.label} снова из основного окна.`,
      tone: "info",
      badge: providerDetails.badge,
    });
    return;
  }

  window.opener.postMessage(
    {
      source: "mbti-auth-callback",
      provider: providerKey,
      ...payload,
    },
    window.location.origin
  );

  if (payload.error) {
    renderState({
      title: `Не удалось завершить вход через ${providerDetails.label}.`,
      body: payload.errorDescription || payload.error,
      tone: "error",
      badge: providerDetails.badge,
    });
    return;
  }

  renderState({
    title: `Вход через ${providerDetails.label} подтверждён.`,
    body: "Это окно можно закрыть. Возвращайтесь на сайт.",
    tone: "info",
    badge: providerDetails.badge,
  });

  window.setTimeout(() => {
    window.close();
  }, 150);
}

function resolveProviderKey() {
  const searchParams = new URLSearchParams(window.location.search);
  const providerKey = searchParams.get("provider");

  return providerKey && PROVIDER_DETAILS[providerKey] ? providerKey : "vk";
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

function renderState({ title, body, tone, badge }) {
  pageHost.innerHTML = `
    <span class="badge ${tone === "error" ? "badge--warm" : "badge--soft"}">${badge}</span>
    <h1 class="card-title">${title}</h1>
    <p class="muted">${body}</p>
    <a class="btn btn--secondary btn--sm" href="/auth/">Вернуться к входу</a>
  `;
}
