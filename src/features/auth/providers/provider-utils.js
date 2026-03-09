const CALLBACK_MESSAGE_SOURCE = "mbti-auth-callback";
const PENDING_STORAGE_PREFIX = "mbti.auth.pending";
const DEFAULT_TIMEOUT = 120_000;

export function getProviderStatus(config, { label, requiredFields, readyDescription }) {
  if (config.mode === "disabled") {
    return {
      key: config.key,
      label,
      mode: config.mode,
      ready: false,
      description: `${label} пока недоступен.`,
    };
  }

  if (config.mode === "mock") {
    return {
      key: config.key,
      label,
      mode: config.mode,
      ready: true,
      description: `Можно попробовать быстрый вход через ${label}.`,
    };
  }

  const missingConfigMessage = buildMissingConfigMessage(config, requiredFields);
  const runtimeOriginMessage = validateRuntimeOrigin(config);
  const featureFlagMessage = validateFeatureFlag(config);
  const combinedMessage = missingConfigMessage || runtimeOriginMessage || featureFlagMessage;

  return {
    key: config.key,
    label,
    mode: config.mode,
    ready: !combinedMessage,
    description: combinedMessage || readyDescription,
  };
}

export function assertRealProviderReady(config, { label, requiredFields }) {
  if (config.mode === "disabled") {
    throw new Error(`${label} сейчас недоступен.`);
  }

  if (config.mode === "mock") {
    return;
  }

  const missingConfigMessage = buildMissingConfigMessage(config, requiredFields);

  if (missingConfigMessage) {
    throw new Error(`${label} пока не готов. ${missingConfigMessage}`);
  }

  const runtimeOriginMessage = validateRuntimeOrigin(config);

  if (runtimeOriginMessage) {
    throw new Error(`${label} пока недоступен. ${runtimeOriginMessage}`);
  }

  const featureFlagMessage = validateFeatureFlag(config);

  if (featureFlagMessage) {
    throw new Error(`${label} пока недоступен. ${featureFlagMessage}`);
  }
}

export function resolveRuntimeOrigin(config) {
  if (typeof window === "undefined") {
    return config.origins?.allowedAppOrigins?.[0] ?? "";
  }

  return window.location.origin;
}

export function resolveProviderUrl(url, config) {
  const runtimeOrigin = resolveRuntimeOrigin(config);
  return new URL(url, runtimeOrigin).toString();
}

export function openAuthPopup(url, popupConfig, popupName) {
  if (typeof window === "undefined") {
    throw new Error("Popup-авторизация доступна только в браузере.");
  }

  const width = popupConfig?.width ?? 540;
  const height = popupConfig?.height ?? 720;
  const left = Math.max((window.screen.width - width) / 2, 0);
  const top = Math.max((window.screen.height - height) / 2, 0);
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");

  const popup = window.open(url, popupName, features);

  if (!popup) {
    throw new Error("Браузер заблокировал окно входа. Разрешите всплывающее окно и попробуйте снова.");
  }

  popup.focus();
  return popup;
}

export function createPendingAuthState(providerKey) {
  const state = createRandomState();
  const storageKey = getPendingStorageKey(providerKey);

  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      state,
      createdAt: Date.now(),
    })
  );

  return state;
}

export function clearPendingAuthState(providerKey) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(getPendingStorageKey(providerKey));
}

export async function waitForAuthPopupMessage({ providerKey, state, popup, timeout = DEFAULT_TIMEOUT }) {
  if (typeof window === "undefined") {
    throw new Error("Ожидание popup-ответа доступно только в браузере.");
  }

  const runtimeOrigin = window.location.origin;

  return new Promise((resolve, reject) => {
    let isDone = false;

    const finish = (callback) => (value) => {
      if (isDone) {
        return;
      }

      isDone = true;
      clearPendingAuthState(providerKey);
      window.removeEventListener("message", handleMessage);
      window.clearInterval(closeWatcher);
      window.clearTimeout(timeoutId);
      callback(value);
    };

    const resolveSafe = finish(resolve);
    const rejectSafe = finish(reject);

    const handleMessage = (event) => {
      if (event.origin !== runtimeOrigin) {
        return;
      }

      const payload = event.data;

      if (!payload || payload.source !== CALLBACK_MESSAGE_SOURCE || payload.provider !== providerKey) {
        return;
      }

      if (payload.state && payload.state !== state) {
        rejectSafe(new Error("Не удалось подтвердить вход. Попробуйте ещё раз."));
        return;
      }

      if (payload.error) {
        rejectSafe(new Error(payload.errorDescription || "Не удалось завершить вход. Попробуйте ещё раз."));
        return;
      }

      popup?.close();
      resolveSafe(payload);
    };

    const closeWatcher = window.setInterval(() => {
      if (popup?.closed) {
        rejectSafe(new Error("Окно авторизации было закрыто до завершения входа."));
      }
    }, 400);

    const timeoutId = window.setTimeout(() => {
      rejectSafe(new Error("Сервис входа не ответил вовремя. Попробуйте ещё раз."));
    }, timeout);

    window.addEventListener("message", handleMessage);
  });
}

export function extractAccessToken(payload) {
  return (
    payload?.access_token ??
    payload?.accessToken ??
    payload?.token ??
    payload?.data?.access_token ??
    payload?.data?.accessToken ??
    payload?.data?.token ??
    null
  );
}

export function buildVkAuthorizeUrl(config) {
  return buildAuthorizeUrl(config, {
    clientFieldName: "appId",
    clientParamName: "client_id",
    extraParams: {
      display: "page",
      v: config.apiVersion ?? "5.199",
    },
  });
}

export function buildYandexAuthorizeUrl(config) {
  return buildAuthorizeUrl(config, {
    clientFieldName: "clientId",
    clientParamName: "client_id",
  });
}

function buildAuthorizeUrl(config, options) {
  const redirectUri = resolveProviderUrl(config.redirectUri, config);
  const state = createPendingAuthState(config.key);
  const url = new URL(config.authorizeUrl);
  url.searchParams.set(options.clientParamName, String(config[options.clientFieldName]));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", config.responseType ?? "token");
  url.searchParams.set("scope", config.scope ?? "");
  url.searchParams.set("state", state);

  Object.entries(options.extraParams ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return {
    state,
    url: url.toString(),
  };
}

function validateRuntimeOrigin(config) {
  const allowedOrigins = config.origins?.allowedAppOrigins ?? [];
  const runtimeOrigin = resolveRuntimeOrigin(config);

  if (allowedOrigins.length > 0 && !allowedOrigins.includes(runtimeOrigin)) {
    return "Этот способ входа пока недоступен на текущем адресе сайта.";
  }

  return "";
}

function validateFeatureFlag(config) {
  if (config.featureFlags?.enableRealAuth === false) {
    return "Этот способ входа пока выключен.";
  }

  return "";
}

function buildMissingConfigMessage(config, requiredFields) {
  const missingFields = requiredFields.filter((fieldName) => !String(config[fieldName] ?? "").trim());

  if (missingFields.length === 0) {
    return "";
  }

  return "Для него ещё не завершена настройка.";
}

function getPendingStorageKey(providerKey) {
  return `${PENDING_STORAGE_PREFIX}.${providerKey}`;
}

function createRandomState() {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
}
