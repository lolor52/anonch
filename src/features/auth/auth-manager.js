import { listProviderConfigs } from "../../config/auth-providers.js";
import { createAuthStore, EMPTY_SESSION } from "./auth-store.js";
import {
  createLocalProfile,
  normalizeDisplayName,
  normalizeUsername,
  validateLocalLogin,
  validateLocalRegistration,
} from "./providers/local-provider.js";
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

    return currentUser;
  }

  function registerLocal(credentials) {
    const validatedCredentials = validateLocalRegistration(credentials);
    const accounts = store.readAccounts();
    const accountList = Object.values(accounts);

    const usernameExists = accountList.some(
      (account) => normalizeUsername(account.username) === normalizeUsername(validatedCredentials.username)
    );

    if (usernameExists) {
      throw new Error("Такой логин уже занят. Используйте другой логин.");
    }

    const displayNameExists = accountList.some(
      (account) =>
        account.authProvider === "local" &&
        normalizeDisplayName(account.displayName) === normalizeDisplayName(validatedCredentials.displayName)
    );

    if (displayNameExists) {
      throw new Error("Такое имя уже занято. Укажите другое имя для локального профиля.");
    }

    const timestamp = now();
    const user = createLocalProfile({
      id: createId(),
      username: validatedCredentials.username,
      displayName: validatedCredentials.displayName,
      authProvider: "local",
      avatar: "",
      now: timestamp,
    });

    accounts[user.id] = user;
    store.writeAccounts(accounts);
    startSession(user, timestamp);
    logger.info(`[auth] Создан локальный профиль ${user.username}.`);
    return user;
  }

  function loginLocal(credentials) {
    const validatedCredentials = validateLocalLogin(credentials);
    const accounts = store.readAccounts();
    const matchedUser = Object.values(accounts).find(
      (account) => normalizeUsername(account.username) === normalizeUsername(validatedCredentials.username)
    );

    if (!matchedUser) {
      throw new Error("Профиль с таким логином не найден. Проверьте логин или зарегистрируйтесь.");
    }

    const timestamp = now();
    const updatedUser = {
      ...matchedUser,
      updatedAt: timestamp,
    };

    accounts[updatedUser.id] = updatedUser;
    store.writeAccounts(accounts);
    startSession(updatedUser, timestamp);
    logger.info(`[auth] Выполнен локальный вход ${updatedUser.username}.`);
    return updatedUser;
  }

  async function signInWithProvider(providerKey) {
    const adapter = providers[providerKey];

    if (!adapter) {
      throw new Error(`Провайдер "${providerKey}" не поддерживается.`);
    }

    const normalizedProfile = await adapter.signIn();
    const accounts = store.readAccounts();
    const accountList = Object.values(accounts);
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
      throw new Error(
        `Нельзя сохранить профиль ${adapter.label}: локальный логин "${normalizedProfile.username}" уже используется.`
      );
    }

    const timestamp = now();
    const user = existingUser
      ? {
          ...existingUser,
          displayName: normalizedProfile.displayName,
          avatar: normalizedProfile.avatar ?? "",
          updatedAt: timestamp,
        }
      : createLocalProfile({
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
    const externalProviders = Object.values(providers).map((provider) => provider.getStatus());

    return [
      {
        key: "local",
        label: "Локально",
        mode: "enabled",
        ready: true,
        description: "Регистрация и вход работают целиком в localStorage.",
      },
      ...externalProviders,
    ];
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
    loginLocal,
    logout,
    registerLocal,
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
