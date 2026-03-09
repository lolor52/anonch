import test from "node:test";
import assert from "node:assert/strict";
import { createMbtiService } from "../../src/features/mbti/mbti-service.js";

function createMemoryStorage() {
  const data = new Map();

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

const questions = {
  items: [
    {
      id: "q1",
      axis: "EI",
      text: "Q1",
      options: [
        { id: "q1o1", label: "A", description: "", weights: { I: 2 } },
        { id: "q1o2", label: "B", description: "", weights: { E: 2 } },
      ],
    },
    {
      id: "q2",
      axis: "SN",
      text: "Q2",
      options: [
        { id: "q2o1", label: "A", description: "", weights: { N: 2 } },
        { id: "q2o2", label: "B", description: "", weights: { S: 2 } },
      ],
    },
    {
      id: "q3",
      axis: "TF",
      text: "Q3",
      options: [
        { id: "q3o1", label: "A", description: "", weights: { F: 2 } },
        { id: "q3o2", label: "B", description: "", weights: { T: 2 } },
      ],
    },
    {
      id: "q4",
      axis: "JP",
      text: "Q4",
      options: [
        { id: "q4o1", label: "A", description: "", weights: { P: 2 } },
        { id: "q4o2", label: "B", description: "", weights: { J: 2 } },
      ],
    },
  ],
};

test("MbtiService сохраняет черновик, завершает тест и обновляет профиль пользователя", () => {
  const storage = createMemoryStorage();
  const profileUpdates = [];
  const service = createMbtiService({
    storage,
    authManager: {
      updateUserProfile(userId, patch) {
        profileUpdates.push({ userId, patch });
      },
    },
    logger: {
      info() {},
    },
    now: () => "2026-03-09T12:00:00.000Z",
  });

  const savedDraft = service.saveDraft("user_1", questions, {
    answers: {
      q1: "q1o1",
      q2: "q2o1",
    },
    currentStep: 3,
  });

  assert.equal(savedDraft.answeredCount, 2);
  assert.equal(service.getDraft("user_1", questions).currentStep, 3);

  const result = service.completeTest("user_1", questions, {
    q1: "q1o1",
    q2: "q2o1",
    q3: "q3o1",
    q4: "q4o1",
  });

  assert.equal(result.typeCode, "INFP");
  assert.equal(service.getDraft("user_1", questions).answeredCount, 0);
  assert.equal(service.getResult("user_1").typeCode, "INFP");
  assert.deepEqual(profileUpdates.at(-1), {
    userId: "user_1",
    patch: {
      mbtiResult: {
        code: "INFP",
        completedAt: "2026-03-09T12:00:00.000Z",
        confidenceByAxis: {
          EI: 100,
          SN: 100,
          TF: 100,
          JP: 100,
        },
      },
    },
  });
});

test("startRetake очищает и черновик, и результат", () => {
  const storage = createMemoryStorage();
  const profileUpdates = [];
  const service = createMbtiService({
    storage,
    authManager: {
      updateUserProfile(userId, patch) {
        profileUpdates.push({ userId, patch });
      },
    },
    logger: {
      info() {},
    },
    now: () => "2026-03-09T12:00:00.000Z",
  });

  service.saveDraft("user_1", questions, {
    answers: {
      q1: "q1o1",
    },
    currentStep: 2,
  });
  service.completeTest("user_1", questions, {
    q1: "q1o1",
    q2: "q2o1",
    q3: "q3o1",
    q4: "q4o1",
  });

  service.startRetake("user_1");

  assert.equal(service.getResult("user_1"), null);
  assert.equal(service.getDraft("user_1", questions).answeredCount, 0);
  assert.deepEqual(profileUpdates.at(-1), {
    userId: "user_1",
    patch: {
      mbtiResult: null,
    },
  });
});
