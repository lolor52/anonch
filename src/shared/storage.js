export function resolveStorage(providedStorage) {
  if (providedStorage) {
    return providedStorage;
  }

  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("Локальное хранилище браузера недоступно.");
  }

  return window.localStorage;
}

export function readJsonValue(storage, key) {
  const rawValue = storage.getItem(key);

  if (rawValue === null) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    throw new Error(`Данные в localStorage по ключу "${key}" повреждены: ${error.message}`);
  }
}

export function writeJsonValue(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

export function removeStoredValue(storage, key) {
  storage.removeItem(key);
}
