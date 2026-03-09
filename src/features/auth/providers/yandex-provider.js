import { getProviderConfig } from "../../../config/auth-providers.js";
import {
  assertRealProviderReady,
  buildYandexAuthorizeUrl,
  clearPendingAuthState,
  extractAccessToken,
  getProviderStatus,
  openAuthPopup,
  waitForAuthPopupMessage,
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
        readyDescription: "Можно войти через отдельное окно.",
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

      const { state, url } = buildYandexAuthorizeUrl(config);
      const popup = openAuthPopup(url, config.popup, "yandex-auth");

      try {
        const authPayload = await waitForAuthPopupMessage({
          providerKey: "yandex",
          popup,
          state,
        });
        const accessToken = extractAccessToken(authPayload);

        if (!accessToken) {
          throw new Error("Вход через Yandex ID не завершился. Попробуйте ещё раз.");
        }

        const profile = await fetchYandexProfile(accessToken, config);
        return normalizeYandexProfile(profile);
      } finally {
        clearPendingAuthState("yandex");
      }
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
    throw new Error("Не удалось получить данные профиля Yandex ID.");
  }

  if (!data.id && !data.login) {
    throw new Error("Yandex ID не передал данные профиля. Попробуйте ещё раз.");
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
