export const MBTI_AXES = Object.freeze([
  Object.freeze({
    key: "EI",
    title: "Энергия",
    letters: Object.freeze(["E", "I"]),
    winnerDescriptions: Object.freeze({
      E: "энергия чаще включается через людей, обмен и внешнее движение",
      I: "энергия чаще восстанавливается через тишину, внутреннюю сборку и дистанцию",
    }),
  }),
  Object.freeze({
    key: "SN",
    title: "Восприятие",
    letters: Object.freeze(["S", "N"]),
    winnerDescriptions: Object.freeze({
      S: "опора чаще идёт на факты, примеры и ощутимую конкретику",
      N: "внимание чаще тянется к идеям, смыслам и общей картине",
    }),
  }),
  Object.freeze({
    key: "TF",
    title: "Решения",
    letters: Object.freeze(["T", "F"]),
    winnerDescriptions: Object.freeze({
      T: "решения чаще проходят через логику, структуру и внутреннюю непротиворечивость",
      F: "решения чаще проходят через ценности, влияние на людей и живой контекст",
    }),
  }),
  Object.freeze({
    key: "JP",
    title: "Стиль жизни",
    letters: Object.freeze(["J", "P"]),
    winnerDescriptions: Object.freeze({
      J: "комфортнее, когда есть ясность, план и ощущение собранности",
      P: "комфортнее, когда есть пространство для манёвра, гибкость и открытый финал",
    }),
  }),
]);

const LETTERS = Object.freeze(["E", "I", "S", "N", "T", "F", "J", "P"]);

export function createEmptyAnswers() {
  return {};
}

export function createEmptyLetterScores() {
  return LETTERS.reduce((scores, letter) => {
    scores[letter] = 0;
    return scores;
  }, {});
}

export function countAnsweredQuestions(questions, answers) {
  return questions.items.reduce((count, question) => {
    return answers[question.id] ? count + 1 : count;
  }, 0);
}

export function getAllowedStep(questions, answers, requestedStep = 1) {
  const totalQuestions = questions.items.length;
  const answeredCount = countAnsweredQuestions(questions, answers);
  const maxStep = Math.min(totalQuestions, answeredCount + 1);
  return clampStep(requestedStep, 1, maxStep);
}

export function isQuestionAnswered(question, answers) {
  return Boolean(question && answers[question.id]);
}

export function sanitizeAnswers(questions, answers = {}) {
  const sanitized = {};

  questions.items.forEach((question) => {
    const answerId = answers[question.id];

    if (!answerId) {
      return;
    }

    const isValidOption = question.options.some((option) => option.id === answerId);

    if (isValidOption) {
      sanitized[question.id] = answerId;
    }
  });

  return sanitized;
}

export function calculateMbtiResult(questions, answers) {
  const normalizedAnswers = sanitizeAnswers(questions, answers);
  const answeredCount = countAnsweredQuestions(questions, normalizedAnswers);
  const totalQuestions = questions.items.length;
  const isComplete = answeredCount === totalQuestions;
  const letterScores = calculateLetterScores(questions, normalizedAnswers);
  const axisResults = buildAxisResults(letterScores);
  const typeCode = MBTI_AXES.map((axis) => axisResults[axis.key].letters.winner).join("");

  return {
    typeCode,
    answeredCount,
    totalQuestions,
    isComplete,
    answers: normalizedAnswers,
    letterScores,
    axisResults,
    explanation: buildResultExplanation(typeCode, axisResults),
  };
}

export function getAnsweredOption(question, answers) {
  const answerId = answers[question.id];
  return question.options.find((option) => option.id === answerId) ?? null;
}

function calculateLetterScores(questions, answers) {
  return questions.items.reduce((scores, question) => {
    const answerId = answers[question.id];

    if (!answerId) {
      return scores;
    }

    const selectedOption = question.options.find((option) => option.id === answerId);

    if (!selectedOption) {
      return scores;
    }

    Object.entries(selectedOption.weights ?? {}).forEach(([letter, value]) => {
      if (!LETTERS.includes(letter)) {
        return;
      }

      scores[letter] += Number(value) || 0;
    });

    return scores;
  }, createEmptyLetterScores());
}

function buildAxisResults(letterScores) {
  return MBTI_AXES.reduce((result, axis) => {
    const [leftLetter, rightLetter] = axis.letters;
    const leftScore = letterScores[leftLetter] ?? 0;
    const rightScore = letterScores[rightLetter] ?? 0;
    const totalScore = leftScore + rightScore;
    const isTie = leftScore === rightScore;
    const winner = leftScore >= rightScore ? leftLetter : rightLetter;
    const loser = winner === leftLetter ? rightLetter : leftLetter;
    const winnerScore = letterScores[winner] ?? 0;
    const loserScore = letterScores[loser] ?? 0;
    const confidencePercent = totalScore === 0 ? 50 : Math.round((winnerScore / totalScore) * 100);
    const differencePercent = totalScore === 0 ? 0 : Math.round((Math.abs(winnerScore - loserScore) / totalScore) * 100);

    result[axis.key] = {
      axis: axis.key,
      title: axis.title,
      letters: {
        winner,
        loser,
      },
      rawScores: {
        [leftLetter]: leftScore,
        [rightLetter]: rightScore,
      },
      totalScore,
      winnerScore,
      loserScore,
      confidencePercent,
      differencePercent,
      isTie,
      note: buildAxisExplanation(axis, winner, differencePercent, isTie),
    };

    return result;
  }, {});
}

function buildAxisExplanation(axis, winner, differencePercent, isTie) {
  if (isTie) {
    return `По оси «${axis.title}» баланс почти ровный: оба полюса проявляются без явного перевеса.`;
  }

  const intensity =
    differencePercent >= 35 ? "Это выраженный перевес" : differencePercent >= 18 ? "Это заметный перевес" : "Это мягкий перевес";

  return `${intensity}: ${axis.winnerDescriptions[winner]}.`;
}

function buildResultExplanation(typeCode, axisResults) {
  const strongestAxes = Object.values(axisResults)
    .sort((left, right) => right.differencePercent - left.differencePercent)
    .slice(0, 2);

  const strongestSummary = strongestAxes
    .map((axis) => `${axis.letters.winner} по оси «${axis.title}»`)
    .join(" и ");

  const softerAxes = Object.values(axisResults)
    .filter((axis) => !strongestAxes.some((item) => item.axis === axis.axis))
    .map((axis) => `${axis.letters.winner} по оси «${axis.title}»`)
    .join(", ");

  if (!softerAxes) {
    return `Тип ${typeCode} собрался из заметного перевеса по ключевым осям: ${strongestSummary}.`;
  }

  return `Тип ${typeCode} собрался из наиболее заметных полюсов ${strongestSummary}, а по оставшимся осям баланс ближе к ${softerAxes}.`;
}

function clampStep(value, min, max) {
  return Math.min(Math.max(Number(value) || min, min), max);
}
