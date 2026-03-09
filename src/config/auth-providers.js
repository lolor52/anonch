const DEFAULT_APP_ORIGINS = ["http://127.0.0.1:4173", "http://localhost:4173"];

export const AUTH_PROVIDER_CONFIGS = Object.freeze({
  local: Object.freeze({
    key: "local",
    label: "Локально",
    mode: "enabled",
  }),
  vk: Object.freeze({
    key: "vk",
    label: "VK ID",
    mode: "mock",
    appId: "",
    redirectUri: "/auth/callback/",
    authorizeUrl: "https://oauth.vk.com/authorize",
    profileUrl: "https://api.vk.com/method/users.get",
    apiVersion: "5.199",
    scope: "email",
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
    mockProfile: Object.freeze({
      username: "vk_demo_alina",
      displayName: "Алина из VK",
      avatar: "",
    }),
  }),
  yandex: Object.freeze({
    key: "yandex",
    label: "Yandex ID",
    mode: "mock",
    clientId: "",
    redirectUri: "/auth/yandex/token/",
    tokenPageOrigin: "",
    authorizeUrl: "https://oauth.yandex.com/authorize",
    profileUrl: "https://login.yandex.ru/info?format=json",
    sdkUrl: "https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-with-polyfills-latest.js",
    tokenSdkUrl: "https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-token-with-polyfills-latest.js",
    scope: "login:avatar login:email login:info",
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
    mockProfile: Object.freeze({
      username: "yandex_demo_ilya",
      displayName: "Илья из Yandex",
      avatar: "",
    }),
  }),
});

export function getProviderConfig(providerKey) {
  return AUTH_PROVIDER_CONFIGS[providerKey] ?? null;
}

export function listProviderConfigs() {
  return Object.values(AUTH_PROVIDER_CONFIGS);
}
