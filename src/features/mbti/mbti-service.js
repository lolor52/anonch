import { createMbtiStore } from "./mbti-store.js";
import { calculateMbtiResult, createEmptyAnswers, getAllowedStep, sanitizeAnswers } from "./mbti-engine.js";

const DEFAULT_LOGGER = console;

export function createMbtiService(options = {}) {
  const store = createMbtiStore(options.storage);
  const authManager = options.authManager;
  const logger = options.logger ?? DEFAULT_LOGGER;
  const now = options.now ?? (() => new Date().toISOString());

  if (!authManager) {
    throw new Error("MbtiService требует authManager.");
  }

  function getDraft(userId, questions) {
    const storedDraft = store.getDraft(userId);

    if (!storedDraft) {
      return createDraft(questions, createEmptyAnswers(), 1, now());
    }

    const answers = sanitizeAnswers(questions, storedDraft.answers);
    const currentStep = getAllowedStep(questions, answers, storedDraft.currentStep ?? 1);

    return createDraft(questions, answers, currentStep, storedDraft.updatedAt ?? now());
  }

  function saveDraft(userId, questions, draft) {
    const answers = sanitizeAnswers(questions, draft.answers);
    const currentStep = getAllowedStep(questions, answers, draft.currentStep ?? 1);
    const normalizedDraft = createDraft(questions, answers, currentStep, now());

    store.saveDraft(userId, normalizedDraft);
    logger.info(`[mbti] Сохранён черновик теста для ${userId}.`);
    return normalizedDraft;
  }

  function getResult(userId) {
    return store.getResult(userId);
  }

  function completeTest(userId, questions, answers) {
    const result = calculateMbtiResult(questions, answers);

    if (!result.isComplete) {
      throw new Error("Нельзя завершить тест, пока не даны ответы на все вопросы.");
    }

    const completedResult = {
      ...result,
      completedAt: now(),
    };

    store.saveResult(userId, completedResult);
    store.clearDraft(userId);
    authManager.updateUserProfile(userId, {
      mbtiResult: {
        code: completedResult.typeCode,
        completedAt: completedResult.completedAt,
        confidenceByAxis: Object.fromEntries(
          Object.entries(completedResult.axisResults).map(([axisKey, axisResult]) => [axisKey, axisResult.confidencePercent])
        ),
      },
    });
    logger.info(`[mbti] Тест завершён для ${userId}: ${completedResult.typeCode}.`);

    return completedResult;
  }

  function resetProgress(userId) {
    store.clearDraft(userId);
    logger.info(`[mbti] Черновик теста очищен для ${userId}.`);
  }

  function resetResult(userId) {
    store.clearResult(userId);
    authManager.updateUserProfile(userId, {
      mbtiResult: null,
    });
    logger.info(`[mbti] Результат теста очищен для ${userId}.`);
  }

  function startRetake(userId) {
    resetProgress(userId);
    resetResult(userId);
  }

  return {
    completeTest,
    getDraft,
    getResult,
    resetProgress,
    resetResult,
    saveDraft,
    startRetake,
  };
}

function createDraft(questions, answers, currentStep, updatedAt) {
  return {
    answers,
    currentStep,
    answeredCount: Object.keys(answers).length,
    totalQuestions: questions.items.length,
    updatedAt,
  };
}
