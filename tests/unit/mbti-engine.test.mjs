import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateMbtiResult,
  countAnsweredQuestions,
  getAllowedStep,
  sanitizeAnswers,
} from "../../src/features/mbti/mbti-engine.js";

const fixtureQuestions = {
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
        { id: "q2o1", label: "A", description: "", weights: { N: 3, F: 1 } },
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

test("движок считает итоговый тип, балансы по осям и объяснение", () => {
  const result = calculateMbtiResult(fixtureQuestions, {
    q1: "q1o1",
    q2: "q2o1",
    q3: "q3o1",
    q4: "q4o1",
  });

  assert.equal(result.typeCode, "INFP");
  assert.equal(result.isComplete, true);
  assert.equal(result.axisResults.EI.letters.winner, "I");
  assert.equal(result.axisResults.SN.letters.winner, "N");
  assert.equal(result.axisResults.TF.letters.winner, "F");
  assert.equal(result.axisResults.JP.letters.winner, "P");
  assert.equal(result.axisResults.SN.confidencePercent, 100);
  assert.match(result.explanation, /INFP/);
});

test("sanitizeAnswers убирает несуществующие ответы и countAnsweredQuestions считает только валидные", () => {
  const answers = sanitizeAnswers(fixtureQuestions, {
    q1: "q1o1",
    q2: "bad-option",
    q4: "q4o1",
    q5: "ghost",
  });

  assert.deepEqual(answers, {
    q1: "q1o1",
    q4: "q4o1",
  });
  assert.equal(countAnsweredQuestions(fixtureQuestions, answers), 2);
});

test("getAllowedStep не даёт перескочить дальше следующего доступного вопроса", () => {
  const answers = {
    q1: "q1o1",
    q2: "q2o1",
  };

  assert.equal(getAllowedStep(fixtureQuestions, answers, 99), 3);
  assert.equal(getAllowedStep(fixtureQuestions, answers, 2), 2);
  assert.equal(getAllowedStep(fixtureQuestions, answers, 0), 1);
});
