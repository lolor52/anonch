import { removeStoredValue, resolveStorage, readJsonValue, writeJsonValue } from "../../shared/storage.js";

export const MBTI_STORAGE_KEYS = Object.freeze({
  draft: "mbti.testDraft",
  result: "mbti.result",
});

export function createMbtiStore(providedStorage) {
  const storage = resolveStorage(providedStorage);

  return {
    getDraft() {
      return readStoredObject(storage, MBTI_STORAGE_KEYS.draft);
    },

    saveDraft(draft) {
      writeJsonValue(storage, MBTI_STORAGE_KEYS.draft, draft);
    },

    clearDraft() {
      removeStoredValue(storage, MBTI_STORAGE_KEYS.draft);
    },

    getResult() {
      return readStoredObject(storage, MBTI_STORAGE_KEYS.result);
    },

    saveResult(result) {
      writeJsonValue(storage, MBTI_STORAGE_KEYS.result, result);
    },

    clearResult() {
      removeStoredValue(storage, MBTI_STORAGE_KEYS.result);
    },
  };
}

function readStoredObject(storage, key) {
  const value = readJsonValue(storage, key);

  if (value === null) {
    return null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Данные по ключу "${key}" имеют неверный формат.`);
  }

  return value;
}
