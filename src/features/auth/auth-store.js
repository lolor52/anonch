import { removeStoredValue, resolveStorage, readJsonValue, writeJsonValue } from "../../shared/storage.js";

export const AUTH_STORAGE_KEYS = Object.freeze({
  accounts: "mbti.accounts",
  session: "mbti.session",
});

export const EMPTY_SESSION = Object.freeze({
  isAuthenticated: false,
  currentUserId: null,
  authProvider: null,
  lastLoginAt: null,
});

export function createAuthStore(providedStorage) {
  const storage = resolveStorage(providedStorage);

  return {
    readAccounts() {
      const accounts = readJsonValue(storage, AUTH_STORAGE_KEYS.accounts);

      if (accounts === null) {
        return {};
      }

      if (!isPlainObject(accounts)) {
        throw new Error("Список профилей имеет неверный формат.");
      }

      return accounts;
    },

    writeAccounts(accounts) {
      if (!isPlainObject(accounts)) {
        throw new Error("Нельзя сохранить профили: ожидается объект, индексированный по id.");
      }

      writeJsonValue(storage, AUTH_STORAGE_KEYS.accounts, accounts);
    },

    readSession() {
      const session = readJsonValue(storage, AUTH_STORAGE_KEYS.session);

      if (session === null) {
        return { ...EMPTY_SESSION };
      }

      if (!isPlainObject(session)) {
        throw new Error("Состояние сессии имеет неверный формат.");
      }

      return {
        ...EMPTY_SESSION,
        ...session,
      };
    },

    writeSession(session) {
      if (!isPlainObject(session)) {
        throw new Error("Нельзя сохранить сессию: ожидается объект.");
      }

      writeJsonValue(storage, AUTH_STORAGE_KEYS.session, {
        ...EMPTY_SESSION,
        ...session,
      });
    },

    clearSession() {
      removeStoredValue(storage, AUTH_STORAGE_KEYS.session);
    },
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
