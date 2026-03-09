import { removeStoredValue, resolveStorage, readJsonValue, writeJsonValue } from "../../shared/storage.js";

export const MBTI_STORAGE_KEYS = Object.freeze({
  drafts: "mbti.testDrafts",
  results: "mbti.results",
});

export function createMbtiStore(providedStorage) {
  const storage = resolveStorage(providedStorage);

  return {
    getDraft(userId) {
      const drafts = readCollection(storage, MBTI_STORAGE_KEYS.drafts);
      return drafts[userId] ?? null;
    },

    saveDraft(userId, draft) {
      const drafts = readCollection(storage, MBTI_STORAGE_KEYS.drafts);
      drafts[userId] = draft;
      writeJsonValue(storage, MBTI_STORAGE_KEYS.drafts, drafts);
    },

    clearDraft(userId) {
      const drafts = readCollection(storage, MBTI_STORAGE_KEYS.drafts);
      delete drafts[userId];

      if (Object.keys(drafts).length === 0) {
        removeStoredValue(storage, MBTI_STORAGE_KEYS.drafts);
        return;
      }

      writeJsonValue(storage, MBTI_STORAGE_KEYS.drafts, drafts);
    },

    getResult(userId) {
      const results = readCollection(storage, MBTI_STORAGE_KEYS.results);
      return results[userId] ?? null;
    },

    saveResult(userId, result) {
      const results = readCollection(storage, MBTI_STORAGE_KEYS.results);
      results[userId] = result;
      writeJsonValue(storage, MBTI_STORAGE_KEYS.results, results);
    },

    clearResult(userId) {
      const results = readCollection(storage, MBTI_STORAGE_KEYS.results);
      delete results[userId];

      if (Object.keys(results).length === 0) {
        removeStoredValue(storage, MBTI_STORAGE_KEYS.results);
        return;
      }

      writeJsonValue(storage, MBTI_STORAGE_KEYS.results, results);
    },
  };
}

function readCollection(storage, key) {
  const value = readJsonValue(storage, key);

  if (value === null) {
    return {};
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Данные по ключу "${key}" имеют неверный формат.`);
  }

  return value;
}
