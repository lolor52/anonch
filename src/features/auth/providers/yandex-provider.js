import { getProviderConfig } from "../../../config/auth-providers.js";
import {
  assertRealProviderReady,
  extractAccessToken,
  getProviderStatus,
  loadExternalScript,
  resolveProviderUrl,
  resolveRuntimeOrigin,
} from "./provider-utils.js";

export function createYandexAuthAdapter(config = getProviderConfig("yandex")) {
  return {
    providerKey: "yandex",
    label: "Yandex ID",
    mode: config.mode,

    getStatus() {
      return getProviderStatus(config, {
        label: "Yandex ID",
        requiredFields: ["clientId", "redirectUri"],
        readyDescription: "Yandex ID готов к мгновенной авторизации через sdk-suggest.js и token-page.",
      });
    },

    async signIn() {
      if (config.mode === "mock") {
        return {
          username: config.mockProfile.username,
          displayName: config.mockProfile.displayName,
          authProvider: "yandex",
          avatar: config.mockProfile.avatar ?? "",
        };
      }

      assertRealProviderReady(config, {
        label: "Yandex ID",
        requiredFields: ["clientId", "redirectUri"],
      });

      await loadExternalScript(config.sdkUrl, "YaAuthSuggest");

      const result = await window.YaAuthSuggest.init(
        {
          client_id: config.clientId,
          response_type: config.responseType ?? "token",
          redirect_uri: resolveProviderUrl(config.redirectUri, config),
        },
        config.tokenPageOrigin || resolveRuntimeOrigin(config)
      );

      if (result?.status === "error") {
        throw new Error(`Yandex ID не инициализировался: ${result.code || "unknown_error"}.`);
      }

      if (typeof result?.handler !== "function") {
        throw new Error("Yandex ID не вернул обработчик входа. Проверьте client_id и redirect URI.");
      }

      const authPayload = await result.handler();
      const accessToken = extractAccessToken(authPayload);

      if (!accessToken) {
        throw new Error("Yandex ID не вернул OAuth token. Проверьте token-page и настройки приложения.");
      }

      const profile = await fetchYandexProfile(accessToken, config);
      return normalizeYandexProfile(profile);
    },
  };
}

async function fetchYandexProfile(accessToken, config) {
  const response = await fetch(config.profileUrl, {
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.message || "Не удалось запросить профиль Yandex ID.");
  }

  if (!data.id && !data.login) {
    throw new Error("Yandex ID вернул неполный профиль пользователя.");
  }

  return data;
}

function normalizeYandexProfile(profile) {
  const displayName = profile.real_name || profile.display_name || profile.login || `Yandex ${profile.id}`;
  const avatar =
    profile.default_avatar_id && !profile.is_avatar_empty
      ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
      : "";

  return {
    username: `yandex_${profile.login || profile.id}`,
    displayName,
    authProvider: "yandex",
    avatar,
  };
}
