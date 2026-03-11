import { createMbtiService } from "../features/mbti/mbti-service.js";
import {
  getAllowedStep,
  getAnsweredOption,
  isQuestionAnswered,
  sanitizeAnswers,
} from "../features/mbti/mbti-engine.js";
import { loadJson, readSearchParam, renderNotice } from "../shared/mbti-data.js";

const layoutHost = document.querySelector("[data-test-layout]");
const mbtiService = createMbtiService();

const state = {
  currentResult: null,
  draft: null,
  questions: null,
  uiCopy: null,
  statusMessage: "",
  statusTone: "info",
  focusTarget: null,
};

if (layoutHost) {
  initTestPage().catch((error) => {
    console.error(error);
    renderNotice(layoutHost, "Не удалось загрузить экран теста.");
  });
}

async function initTestPage() {
  const [questions, uiCopy] = await Promise.all([loadJson("questions"), loadJson("ui-copy")]);
  const existingResult = mbtiService.getResult();
  const requestedQuestion = Number.parseInt(readSearchParam("question") ?? "1", 10);
  const savedDraft = mbtiService.getDraft(questions);
  const currentStep = getAllowedStep(questions, savedDraft.answers, Number.isNaN(requestedQuestion) ? savedDraft.currentStep : requestedQuestion);

  state.currentResult = existingResult;
  state.questions = questions;
  state.uiCopy = uiCopy;
  state.draft = mbtiService.saveDraft(questions, {
    ...savedDraft,
    currentStep,
  });

  render();
}

function render() {
  if (state.currentResult && state.draft.answeredCount === 0) {
    renderCompletedState();
  } else {
    renderQuestionState();
  }

  bindEvents();
  restoreFocus();
}

function renderCompletedState() {
  const resultDate = formatDate(state.currentResult.completedAt);

  layoutHost.innerHTML = `
    <div class="stack-lg test-full-width">
      <article class="card card--soft test-state-card">
        <span class="badge">Тест уже завершён</span>
        <h2 class="card-title">У вас уже сохранён результат ${state.currentResult.typeCode}.</h2>
        <p class="muted">
          Последнее прохождение сохранено ${resultDate}. Можно открыть страницу результата или начать тест заново после подтверждения.
        </p>
        <div class="cluster">
          <a class="btn btn--primary" href="/result/">Открыть результат</a>
          <button class="btn btn--secondary" type="button" data-retake-trigger>Пройти заново</button>
          <a class="btn btn--ghost" href="/types/">Смотреть типы</a>
        </div>
      </article>
    </div>
  `;

  syncUrl();
}

function renderQuestionState() {
  const question = state.questions.items[state.draft.currentStep - 1];
  const answeredCount = state.draft.answeredCount;
  const progressByAnswers = Math.round((answeredCount / state.questions.items.length) * 100);
  const selectedOption = getAnsweredOption(question, state.draft.answers);
  const statusMarkup = state.statusMessage
    ? `<div class="test-status test-status--${state.statusTone}" role="status" aria-live="polite">${state.statusMessage}</div>`
    : "";

  layoutHost.innerHTML = `
    <aside class="test-sidebar">
      <article class="card card--soft">
        <div class="stack">
          <span class="badge">Шаг ${state.draft.currentStep} из ${state.questions.items.length}</span>
          <h2 class="card-title">Прогресс прохождения</h2>
          <div
            class="progress"
            role="progressbar"
            aria-label="Прогресс по ответам"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${progressByAnswers}"
          >
            <div class="progress-bar" style="width: ${progressByAnswers}%"></div>
          </div>
          <p class="muted">${answeredCount} из ${state.questions.items.length} ответов уже сохранены локально.</p>
          <p class="subtle">Последнее сохранение: ${formatDate(state.draft.updatedAt)}</p>
        </div>
      </article>

      <article class="card">
        <h3 class="card-title">${state.uiCopy.testPreview.sidebarTitle}</h3>
        <ul class="card-list">
          ${state.uiCopy.testPreview.sidebarTips.map((tip) => `<li>${tip}</li>`).join("")}
        </ul>
      </article>
    </aside>

    <div class="stack-lg">
      <article class="card question-card" data-question-card>
        ${statusMarkup}
        <div class="cluster">
          <span class="badge">Ось ${question.axis[0]} / ${question.axis[1]}</span>
          <span class="badge badge--soft">${question.options.length} варианта</span>
          <span class="badge badge--soft" data-question-index>Вопрос ${state.draft.currentStep}</span>
        </div>

        <div class="stack">
          <p class="subtle">Вопрос</p>
          <h2 id="test-question-title" tabindex="-1" data-question-title>${question.text}</h2>
          <p class="muted">Каждый ответ добавляет веса к одной или нескольким дихотомиям, а черновик сохраняется автоматически.</p>
        </div>

        <div class="answer-list" role="radiogroup" aria-labelledby="test-question-title" data-answer-list>
          ${question.options
            .map(
              (option, index) =>
                `
                <button
                  class="answer-option ${selectedOption?.id === option.id ? "is-selected" : ""}"
                  type="button"
                  role="radio"
                  aria-checked="${selectedOption?.id === option.id}"
                  aria-describedby="test-selected-answer-note"
                  data-answer-id="${option.id}"
                  data-answer-index="${index}"
                >
                  <strong>${option.label}</strong>
                  <span class="muted">${option.description}</span>
                </button>
              `
            )
            .join("")}
        </div>

        <div class="selected-answer-note" id="test-selected-answer-note" role="status" aria-live="polite">
          ${
            selectedOption
              ? `Выбран ответ: <strong>${selectedOption.label}</strong>. Его веса уже учтены в локальном черновике.`
              : "Выберите один вариант, чтобы перейти дальше."
          }
        </div>

        <div class="test-nav">
          <button class="btn btn--ghost" type="button" data-nav-action="back" ${state.draft.currentStep === 1 ? "disabled" : ""}>
            Назад
          </button>
          <div class="cluster">
            <button class="btn btn--secondary" type="button" data-save-later>Сохранить позже</button>
            <button
              class="btn btn--primary"
              type="button"
              data-nav-action="next"
              ${isQuestionAnswered(question, state.draft.answers) ? "" : "disabled"}
            >
              ${state.draft.currentStep === state.questions.items.length ? "Завершить тест" : "Следующий вопрос"}
            </button>
          </div>
        </div>
      </article>

      <div class="section-grid">
        ${state.uiCopy.testPreview.detailCards
          .map(
            (card) => `
              <article class="card">
                <h3 class="card-title">${card.title}</h3>
                <p class="muted">${card.body}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  `;

  syncUrl();
}

function bindEvents() {
  layoutHost.querySelectorAll("[data-answer-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const question = state.questions.items[state.draft.currentStep - 1];

      state.draft = mbtiService.saveDraft(state.questions, {
        ...state.draft,
        answers: {
          ...sanitizeAnswers(state.questions, state.draft.answers),
          [question.id]: button.dataset.answerId,
        },
      });
      state.statusMessage = "Ответ сохранён локально.";
      state.statusTone = "info";
      state.focusTarget = { type: "answer", value: button.dataset.answerId };
      render();
    });
  });

  const answerList = layoutHost.querySelector("[data-answer-list]");

  if (answerList) {
    answerList.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }

      const buttons = [...answerList.querySelectorAll("[data-answer-id]")];
      const activeElement = document.activeElement;
      const currentIndex = buttons.findIndex((button) => button === activeElement);

      if (currentIndex === -1) {
        return;
      }

      event.preventDefault();
      const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
      buttons[nextIndex].click();
      buttons[nextIndex].focus();
    });
  }

  layoutHost.querySelectorAll("[data-nav-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.navAction === "back") {
        goToStep(state.draft.currentStep - 1);
        return;
      }

      handleNextStep();
    });
  });

  const saveLaterButton = layoutHost.querySelector("[data-save-later]");

  if (saveLaterButton) {
    saveLaterButton.addEventListener("click", () => {
      state.draft = mbtiService.saveDraft(state.questions, state.draft);
      state.statusMessage = "Прогресс сохранён. Можно закрыть страницу и вернуться позже.";
      state.statusTone = "info";
      state.focusTarget = { type: "save-later" };
      render();
    });
  }

  const retakeButton = layoutHost.querySelector("[data-retake-trigger]");

  if (retakeButton) {
    retakeButton.addEventListener("click", () => {
      const confirmed = window.confirm("Сбросить текущий результат и начать тест заново?");

      if (!confirmed) {
        return;
      }

      mbtiService.startRetake();
      state.currentResult = null;
      state.draft = mbtiService.getDraft(state.questions);
      state.statusMessage = "Прошлый результат очищен. Можно проходить тест заново.";
      state.statusTone = "info";
      state.focusTarget = { type: "heading" };
      render();
    });
  }
}

function goToStep(step) {
  state.draft = mbtiService.saveDraft(state.questions, {
    ...state.draft,
    currentStep: step,
  });
  state.statusMessage = "";
  state.focusTarget = { type: "heading" };
  render();
}

function handleNextStep() {
  const question = state.questions.items[state.draft.currentStep - 1];

  if (!isQuestionAnswered(question, state.draft.answers)) {
    state.statusMessage = "Сначала выберите ответ, потом переходите дальше.";
    state.statusTone = "error";
    state.focusTarget = { type: "answer-list" };
    render();
    return;
  }

  if (state.draft.currentStep === state.questions.items.length) {
    const result = mbtiService.completeTest(state.questions, state.draft.answers);
    state.currentResult = result;
    window.location.assign("/result/");
    return;
  }

  goToStep(state.draft.currentStep + 1);
}

function restoreFocus() {
  if (!state.focusTarget) {
    return;
  }

  const focusMap = {
    heading: () => layoutHost.querySelector("[data-question-title]"),
    "answer-list": () => layoutHost.querySelector("[data-answer-id]"),
    "save-later": () => layoutHost.querySelector("[data-save-later]"),
  };
  const target =
    state.focusTarget.type === "answer"
      ? layoutHost.querySelector(`[data-answer-id="${state.focusTarget.value}"]`)
      : focusMap[state.focusTarget.type]?.();

  target?.focus();
  state.focusTarget = null;
}

function syncUrl() {
  const targetUrl =
    state.currentResult && state.draft.answeredCount === 0 ? "/test/" : `/test/?question=${state.draft.currentStep}`;
  history.replaceState({}, document.title, targetUrl);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
