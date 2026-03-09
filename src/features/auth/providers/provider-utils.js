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
      description: `${label} отключён в конфигурации.`,
    };
  }

  if (config.mode === "mock") {
    return {
      key: config.key,
      label,
      mode: config.mode,
      ready: true,
      description: `${label} работает в mock-режиме без внешних ключей.`,
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
    throw new Error(`${label} отключён. Включите его в src/config/auth-providers.js.`);
  }

  if (config.mode === "mock") {
    return;
  }

  const missingConfigMessage = buildMissingConfigMessage(config, requiredFields);

  if (missingConfigMessage) {
    throw new Error(`${label} не настроен. ${missingConfigMessage}`);
  }

  const runtimeOriginMessage = validateRuntimeOrigin(config);

  if (runtimeOriginMessage) {
    throw new Error(`${label} не готов к запуску. ${runtimeOriginMessage}`);
  }

  const featureFlagMessage = validateFeatureFlag(config);

  if (featureFlagMessage) {
    throw new Error(`${label} не готов к запуску. ${featureFlagMessage}`);
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

export async function loadExternalScript(url, globalName) {
  if (typeof window === "undefined") {
    throw new Error("Внешний SDK можно загрузить только в браузере.");
  }

  if (globalName && window[globalName]) {
    return window[globalName];
  }

  const existingScript = document.querySelector(`script[data-sdk-src="${url}"]`);

  if (existingScript) {
    await waitForScriptLoad(existingScript);
    return globalName ? window[globalName] : undefined;
  }

  const script = document.createElement("script");
  script.src = url;
  script.async = true;
  script.dataset.sdkSrc = url;

  const loadPromise = waitForScriptLoad(script);
  document.head.append(script);
  await loadPromise;

  if (globalName && !window[globalName]) {
    throw new Error(`SDK "${globalName}" загрузился, но не инициализировал ожидаемую глобальную переменную.`);
  }

  return globalName ? window[globalName] : undefined;
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
    throw new Error("Браузер заблокировал окно авторизации. Разрешите popup и попробуйте снова.");
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
        rejectSafe(new Error("Параметр state не совпал. Авторизация была прервана."));
        return;
      }

      if (payload.error) {
        rejectSafe(new Error(payload.errorDescription || `Провайдер ${providerKey} вернул ошибку "${payload.error}".`));
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
      rejectSafe(new Error("Провайдер не завершил авторизацию вовремя. Попробуйте ещё раз."));
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
  const redirectUri = resolveProviderUrl(config.redirectUri, config);
  const state = createPendingAuthState(config.key);
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", String(config.appId));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", config.responseType ?? "token");
  url.searchParams.set("scope", config.scope ?? "");
  url.searchParams.set("state", state);
  url.searchParams.set("display", "page");
  url.searchParams.set("v", config.apiVersion ?? "5.199");

  return {
    state,
    url: url.toString(),
  };
}

function validateRuntimeOrigin(config) {
  const allowedOrigins = config.origins?.allowedAppOrigins ?? [];
  const runtimeOrigin = resolveRuntimeOrigin(config);

  if (allowedOrigins.length > 0 && !allowedOrigins.includes(runtimeOrigin)) {
    return `Текущий origin "${runtimeOrigin}" не входит в allowedAppOrigins.`;
  }

  return "";
}

function validateFeatureFlag(config) {
  if (config.featureFlags?.enableRealAuth === false) {
    return "Real-режим отключён флагом enableRealAuth.";
  }

  return "";
}

function buildMissingConfigMessage(config, requiredFields) {
  const missingFields = requiredFields.filter((fieldName) => !String(config[fieldName] ?? "").trim());

  if (missingFields.length === 0) {
    return "";
  }

  return `Заполните ${missingFields.join(", ")} в src/config/auth-providers.js или переключите mode на mock.`;
}

function waitForScriptLoad(script) {
  if (script.dataset.sdkLoaded === "true") {
    return Promise.resolve();
  }

  if (script.dataset.sdkLoaded === "error") {
    return Promise.reject(new Error(`Не удалось загрузить внешний SDK: ${script.src}`));
  }

  return new Promise((resolve, reject) => {
    script.addEventListener(
      "load",
      () => {
        script.dataset.sdkLoaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => {
        script.dataset.sdkLoaded = "error";
        reject(new Error(`Не удалось загрузить внешний SDK: ${script.src}`));
      },
      { once: true }
    );
  });
}

function getPendingStorageKey(providerKey) {
  return `${PENDING_STORAGE_PREFIX}.${providerKey}`;
}

function createRandomState() {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
}
