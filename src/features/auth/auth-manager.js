import { listProviderConfigs } from "../../config/auth-providers.js";
import { createAuthStore, EMPTY_SESSION } from "./auth-store.js";
import { createStoredProfile, normalizeUsername } from "./profile-utils.js";
import { createVkAuthAdapter } from "./providers/vk-provider.js";
import { createYandexAuthAdapter } from "./providers/yandex-provider.js";

const DEFAULT_LOGGER = console;

export function createAuthManager(options = {}) {
  const store = createAuthStore(options.storage);
  const logger = options.logger ?? DEFAULT_LOGGER;
  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.idGenerator ?? (() => `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  const providerConfigs = options.providerConfigs ?? listProviderConfigs();
  const providers = buildProviders(providerConfigs);
  const supportedProviderKeys = new Set(Object.keys(providers));

  function listAccounts() {
    return Object.values(store.readAccounts());
  }

  function getSession() {
    return store.readSession();
  }

  function getCurrentUser() {
    const session = getSession();

    if (!session.isAuthenticated || !session.currentUserId) {
      return null;
    }

    const accounts = store.readAccounts();
    return accounts[session.currentUserId] ?? null;
  }

  function restoreSession() {
    const session = getSession();

    if (!session.isAuthenticated || !session.currentUserId) {
      return null;
    }

    const accounts = store.readAccounts();
    const currentUser = accounts[session.currentUserId] ?? null;

    if (!currentUser) {
      logger.error("[auth] Не удалось восстановить сессию: профиль пользователя отсутствует.");
      store.clearSession();
      emitAuthChanged(null);
      return null;
    }

    if (!supportedProviderKeys.has(currentUser.authProvider)) {
      logger.error("[auth] Не удалось восстановить сессию: способ входа больше не поддерживается.");
      store.clearSession();
      emitAuthChanged(null);
      return null;
    }

    return currentUser;
  }

  async function signInWithProvider(providerKey) {
    const adapter = providers[providerKey];

    if (!adapter) {
      throw new Error(`Провайдер "${providerKey}" не поддерживается.`);
    }

    const normalizedProfile = await adapter.signIn();
    const accounts = store.readAccounts();
    const accountList = Object.values(accounts).filter((account) => supportedProviderKeys.has(account.authProvider));
    const existingUser = accountList.find(
      (account) =>
        account.authProvider === providerKey &&
        normalizeUsername(account.username) === normalizeUsername(normalizedProfile.username)
    );
    const usernameConflict = accountList.find(
      (account) =>
        account.id !== existingUser?.id &&
        normalizeUsername(account.username) === normalizeUsername(normalizedProfile.username)
    );

    if (usernameConflict) {
      throw new Error(`Нельзя сохранить профиль ${adapter.label}: идентификатор "${normalizedProfile.username}" уже занят.`);
    }

    const timestamp = now();
    const user = existingUser
      ? {
          ...existingUser,
          displayName: normalizedProfile.displayName,
          avatar: normalizedProfile.avatar ?? "",
          updatedAt: timestamp,
        }
      : createStoredProfile({
          id: createId(),
          username: normalizedProfile.username,
          displayName: normalizedProfile.displayName,
          authProvider: providerKey,
          avatar: normalizedProfile.avatar ?? "",
          now: timestamp,
        });

    accounts[user.id] = user;
    store.writeAccounts(accounts);
    startSession(user, timestamp);
    logger.info(`[auth] Выполнен вход через ${adapter.label}: ${user.username}.`);
    return user;
  }

  function logout() {
    const currentUser = getCurrentUser();
    store.clearSession();
    emitAuthChanged(null);

    if (currentUser) {
      logger.info(`[auth] Пользователь ${currentUser.username} вышел из профиля.`);
    }
  }

  function updateUserProfile(userId, patch) {
    const accounts = store.readAccounts();
    const existingUser = accounts[userId];

    if (!existingUser) {
      throw new Error(`Профиль пользователя "${userId}" не найден.`);
    }

    const updatedUser = {
      ...existingUser,
      ...patch,
      updatedAt: now(),
    };

    accounts[userId] = updatedUser;
    store.writeAccounts(accounts);

    if (getSession().currentUserId === userId) {
      emitAuthChanged(updatedUser);
    }

    return updatedUser;
  }

  function listProviderStatuses() {
    return Object.values(providers).map((provider) => provider.getStatus());
  }

  function startSession(user, timestamp) {
    store.writeSession({
      isAuthenticated: true,
      currentUserId: user.id,
      authProvider: user.authProvider,
      lastLoginAt: timestamp,
    });
    emitAuthChanged(user);
  }

  function emitAuthChanged(user) {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("auth:changed", {
        detail: {
          user,
          session: user
            ? {
                isAuthenticated: true,
                currentUserId: user.id,
                authProvider: user.authProvider,
              }
            : { ...EMPTY_SESSION },
        },
      })
    );
  }

  return {
    getSession,
    getCurrentUser,
    listAccounts,
    listProviderStatuses,
    logout,
    restoreSession,
    signInWithProvider,
    updateUserProfile,
  };
}

function buildProviders(providerConfigs) {
  const configMap = providerConfigs.reduce((accumulator, config) => {
    accumulator[config.key] = config;
    return accumulator;
  }, {});

  return {
    vk: createVkAuthAdapter(configMap.vk),
    yandex: createYandexAuthAdapter(configMap.yandex),
  };
}
