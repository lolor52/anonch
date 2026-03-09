import { getProviderConfig } from "../../../config/auth-providers.js";
import {
  assertRealProviderReady,
  extractAuthorizationCode,
  buildVkAuthorizeUrl,
  clearPendingAuthState,
  getProviderStatus,
  openAuthPopup,
  readPendingAuthState,
  resolveProviderUrl,
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
        readyDescription: "Можно войти через отдельное окно по защищённой схеме VK ID.",
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

      const { state, url } = await buildVkAuthorizeUrl(config);
      const popup = openAuthPopup(url, config.popup, "vk-auth");

      try {
        const authPayload = await waitForAuthPopupMessage({
          providerKey: "vk",
          popup,
          state,
        });
        const authCode = extractAuthorizationCode(authPayload);
        const pendingState = readPendingAuthState("vk");

        if (!authCode || !pendingState?.codeVerifier || !authPayload.device_id) {
          throw new Error("Вход через VK ID не завершился. Попробуйте ещё раз.");
        }

        const tokens = await exchangeVkCodeForTokens({
          authCode,
          deviceId: authPayload.device_id,
          state,
          codeVerifier: pendingState.codeVerifier,
          config,
        });

        const accessToken = tokens.access_token;
        const profile = await fetchVkProfile(accessToken, config);
        return normalizeVkProfile(profile, authPayload.email);
      } finally {
        clearPendingAuthState("vk");
      }
    },
  };
}

async function exchangeVkCodeForTokens({ authCode, deviceId, state, codeVerifier, config }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: authCode,
    code_verifier: codeVerifier,
    client_id: String(config.appId),
    device_id: String(deviceId),
    redirect_uri: resolveProviderUrl(config.redirectUri, config),
    state,
  });
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: body.toString(),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.error || !data?.access_token) {
    throw new Error("Не удалось обменять код VK ID на токен доступа.");
  }

  return data;
}

async function fetchVkProfile(accessToken, config) {
  const body = new URLSearchParams({
    access_token: accessToken,
    client_id: String(config.appId),
  });
  const response = await fetch(config.profileUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: body.toString(),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.user?.user_id) {
    throw new Error("Не удалось получить данные профиля VK ID.");
  }

  return data.user;
}

function normalizeVkProfile(profile, email) {
  const username = `vk_${profile.user_id}`;
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  const displayName = fullName || email || `VK ${profile.user_id}`;

  return {
    username,
    displayName,
    authProvider: "vk",
    avatar: profile.avatar ?? "",
  };
}
