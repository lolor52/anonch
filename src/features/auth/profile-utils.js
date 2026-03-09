export function normalizeUsername(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("ru-RU");
}

export function createStoredProfile({ id, username, displayName, authProvider, avatar, now }) {
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