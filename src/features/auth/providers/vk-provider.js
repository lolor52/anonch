import { getProviderConfig } from "../../../config/auth-providers.js";
import {
  assertRealProviderReady,
  buildVkAuthorizeUrl,
  clearPendingAuthState,
  extractAccessToken,
  getProviderStatus,
  openAuthPopup,
  waitForAuthPopupMessage,
} from "./provider-utils.js";

export function createVkAuthAdapter(config = getProviderConfig("vk")) {
  return {
    providerKey: "vk",
    label: "VK ID",
    mode: config.mode,

    getStatus() {
      return getProviderStatus(config, {
        label: "VK ID",
        requiredFields: ["appId", "redirectUri"],
        readyDescription: "Можно войти через отдельное окно.",
      });
    },

    async signIn() {
      if (config.mode === "mock") {
        return {
          username: config.mockProfile.username,
          displayName: config.mockProfile.displayName,
          authProvider: "vk",
          avatar: config.mockProfile.avatar ?? "",
        };
      }

      assertRealProviderReady(config, {
        label: "VK ID",
        requiredFields: ["appId", "redirectUri"],
      });

      const { state, url } = buildVkAuthorizeUrl(config);
      const popup = openAuthPopup(url, config.popup, "vk-auth");

      try {
        const authPayload = await waitForAuthPopupMessage({
          providerKey: "vk",
          popup,
          state,
        });
        const accessToken = extractAccessToken(authPayload);

        if (!accessToken) {
          throw new Error("Вход через VK ID не завершился. Попробуйте ещё раз.");
        }

        const profile = await fetchVkProfile(accessToken, config);
        return normalizeVkProfile(profile, authPayload);
      } finally {
        clearPendingAuthState("vk");
      }
    },
  };
}

async function fetchVkProfile(accessToken, config) {
  const requestUrl = new URL(config.profileUrl);
  requestUrl.searchParams.set("fields", "photo_200,screen_name");
  requestUrl.searchParams.set("access_token", accessToken);
  requestUrl.searchParams.set("v", config.apiVersion ?? "5.199");

  const response = await fetch(requestUrl.toString());
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error("Не удалось получить данные профиля VK ID.");
  }

  const profile = data.response?.[0];

  if (!profile?.id) {
    throw new Error("VK ID не передал данные профиля. Попробуйте ещё раз.");
  }

  return profile;
}

function normalizeVkProfile(profile, authPayload) {
  const screenName = String(profile.screen_name ?? "").trim();
  const username = screenName ? `vk_${screenName}` : `vk_${profile.id}`;
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  const displayName = fullName || authPayload.email || `VK ${profile.id}`;

  return {
    username,
    displayName,
    authProvider: "vk",
    avatar: profile.photo_200 ?? "",
  };
}
