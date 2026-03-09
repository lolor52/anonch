const DEFAULT_APP_ORIGINS = ["http://127.0.0.1:4173", "http://localhost:4173"];

export const AUTH_PROVIDER_CONFIGS = Object.freeze({
  vk: Object.freeze({
    key: "vk",
    label: "VK ID",
    mode: "real",
    appId: "",
    redirectUri: "/auth/callback/?provider=vk",
    authorizeUrl: "https://id.vk.ru/authorize",
    tokenUrl: "https://id.vk.ru/oauth2/auth",
    profileUrl: "https://id.vk.ru/oauth2/user_info",
    scope: "vkid.personal_info",
    responseType: "code",
    popup: Object.freeze({
      width: 540,
      height: 720,
    }),
    origins: Object.freeze({
      allowedAppOrigins: DEFAULT_APP_ORIGINS,
    }),
    featureFlags: Object.freeze({
      enableRealAuth: true,
    }),
  }),
  yandex: Object.freeze({
    key: "yandex",
    label: "Yandex ID",
    mode: "real",
    clientId: "",
    redirectUri: "/auth/callback/?provider=yandex",
    authorizeUrl: "https://oauth.yandex.com/authorize",
    profileUrl: "https://login.yandex.ru/info?format=json",
    scope: "login:avatar login:info",
    responseType: "token",
    popup: Object.freeze({
      width: 540,
      height: 720,
    }),
    origins: Object.freeze({
      allowedAppOrigins: DEFAULT_APP_ORIGINS,
    }),
    featureFlags: Object.freeze({
      enableRealAuth: true,
    }),
  }),
});

export function getProviderConfig(providerKey) {
  return AUTH_PROVIDER_CONFIGS[providerKey] ?? null;
}

export function listProviderConfigs() {
  return Object.values(AUTH_PROVIDER_CONFIGS);
}
