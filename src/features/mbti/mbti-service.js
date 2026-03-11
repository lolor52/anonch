import { createMbtiStore } from "./mbti-store.js";
import { calculateMbtiResult, createEmptyAnswers, getAllowedStep, sanitizeAnswers } from "./mbti-engine.js";

const DEFAULT_LOGGER = console;

export function createMbtiService(options = {}) {
  const store = createMbtiStore(options.storage);
  const logger = options.logger ?? DEFAULT_LOGGER;
  const now = options.now ?? (() => new Date().toISOString());

  function getDraft(questions) {
    const storedDraft = store.getDraft();

    if (!storedDraft) {
      return createDraft(questions, createEmptyAnswers(), 1, now());
    }

    const answers = sanitizeAnswers(questions, storedDraft.answers);
    const currentStep = getAllowedStep(questions, answers, storedDraft.currentStep ?? 1);

    return createDraft(questions, answers, currentStep, storedDraft.updatedAt ?? now());
  }

  function saveDraft(questions, draft) {
    const answers = sanitizeAnswers(questions, draft.answers);
    const currentStep = getAllowedStep(questions, answers, draft.currentStep ?? 1);
    const normalizedDraft = createDraft(questions, answers, currentStep, now());

    store.saveDraft(normalizedDraft);
    logger.info("[mbti] Сохранён локальный черновик теста.");
    return normalizedDraft;
  }

  function getResult() {
    return store.getResult();
  }

  function completeTest(questions, answers) {
    const result = calculateMbtiResult(questions, answers);

    if (!result.isComplete) {
      throw new Error("Нельзя завершить тест, пока не даны ответы на все вопросы.");
    }

    const completedResult = {
      ...result,
      completedAt: now(),
    };

    store.saveResult(completedResult);
    store.clearDraft();
    logger.info(`[mbti] Тест завершён локально: ${completedResult.typeCode}.`);

    return completedResult;
  }

  function resetProgress() {
    store.clearDraft();
    logger.info("[mbti] Локальный черновик теста очищен.");
  }

  function resetResult() {
    store.clearResult();
    logger.info("[mbti] Локальный результат теста очищен.");
  }

  function startRetake() {
    resetProgress();
    resetResult();
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
