const LOGIN_PATTERN = /^[\p{L}\p{N}._-]+$/u;

export function normalizeUsername(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("ru-RU");
}

export function normalizeDisplayName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru-RU");
}

export function validateLocalRegistration({ username, displayName }) {
  const cleanUsername = String(username ?? "").trim();
  const cleanDisplayName = String(displayName ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (!cleanUsername) {
    throw new Error("Укажите логин для локального профиля.");
  }

  if (!LOGIN_PATTERN.test(cleanUsername)) {
    throw new Error("Логин может содержать только буквы, цифры, точку, дефис и нижнее подчёркивание.");
  }

  if (!cleanDisplayName) {
    throw new Error("Укажите имя, которое будет видно в профиле.");
  }

  return {
    username: cleanUsername,
    displayName: cleanDisplayName,
  };
}

export function validateLocalLogin({ username }) {
  const cleanUsername = String(username ?? "").trim();

  if (!cleanUsername) {
    throw new Error("Введите логин, чтобы войти в локальный профиль.");
  }

  return {
    username: cleanUsername,
  };
}

export function createLocalProfile({ id, username, displayName, authProvider, avatar, now }) {
  return {
    id,
    username,
    displayName,
    authProvider,
    avatar: avatar ?? "",
    mbtiResult: null,
    createdAt: now,
    updatedAt: now,
  };
}
