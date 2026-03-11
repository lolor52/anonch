import { createMbtiService } from "../features/mbti/mbti-service.js";
import {
  buildFallbackMatchNote,
  getCompatibilityMeta,
  getGroupBadgeClass,
  getGroupByCode,
  getPairKey,
  getTypeByCode,
  getTypePath,
  loadJson,
  renderNotice,
} from "../shared/mbti-data.js";

const pageHost = document.querySelector("[data-result-page]");
const mbtiService = createMbtiService();

if (pageHost) {
  initResultPage().catch((error) => {
    console.error(error);
    renderNotice(pageHost, "Не удалось загрузить данные результата.");
  });
}

async function initResultPage() {
  const [types, categories, compatibility] = await Promise.all([
    loadJson("types"),
    loadJson("categories"),
    loadJson("compatibility"),
  ]);
  const storedResult = mbtiService.getResult();

  if (!storedResult) {
    renderEmptyResultState();
    return;
  }

  const currentType = getTypeByCode(types, storedResult.typeCode);

  if (!currentType) {
    throw new Error(`Тип ${storedResult.typeCode} отсутствует в types.json.`);
  }

  const currentGroup = getGroupByCode(categories, currentType.group);
  const topMatches = currentType.strongMatches
    .map((code) => ({
      type: getTypeByCode(types, code),
      score: compatibility.matrix[currentType.code][code],
    }))
    .filter((item) => item.type);
  const difficultMatches = currentType.difficultMatches
    .map((code) => ({
      type: getTypeByCode(types, code),
      score: compatibility.matrix[currentType.code][code],
    }))
    .filter((item) => item.type);

  document.title = `${storedResult.typeCode} — результат MBTI — АнонЧ`;

  pageHost.innerHTML = `
    <section class="section hero">
      <div class="container-wide hero-grid result-hero">
        <div class="stack-lg">
          <span class="eyebrow">Результат MBTI</span>
          <div class="stack">
            <div class="cluster">
              <span class="${getGroupBadgeClass(currentType.group)}" data-result-type>${storedResult.typeCode}</span>
              <span class="badge badge--soft">${currentGroup?.title ?? ""}</span>
              <span class="badge badge--soft">${currentGroup?.label ?? ""}</span>
              <span class="badge badge--soft">Пройден ${formatDate(storedResult.completedAt)}</span>
            </div>
            <h1>${currentType.fullName}: ${currentType.shortDescription}</h1>
            <p class="lead">${storedResult.explanation}</p>
          </div>
          <div class="cluster">
            <a class="btn btn--primary" href="${getTypePath(currentType.code)}">Открыть страницу типа</a>
            <button class="btn btn--secondary" type="button" data-retake-result>Пройти заново</button>
          </div>
        </div>

        <article class="card card--contrast quote-card">
          <span class="badge badge--warm">Краткий портрет</span>
          <p>${currentType.friendship}</p>
          <p class="subtle">Результат сохранён локально и восстановится после перезагрузки, пока вы не сбросите его вручную.</p>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">4 оси</span>
          <h2>По каждой оси видно не только букву, но и уверенность выбранного полюса.</h2>
        </div>

        <div class="kpi-grid">
          ${Object.values(storedResult.axisResults)
            .map(
              (axisResult) => `
                <article class="card metric">
                  <div class="metric-head">
                    <span>${axisResult.title}</span>
                    <strong>${axisResult.letters.winner} ${axisResult.confidencePercent}%</strong>
                  </div>
                  <div
                    class="progress"
                    role="progressbar"
                    aria-label="${axisResult.title}: уверенность по оси"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow="${axisResult.confidencePercent}"
                  >
                    <div class="progress-bar" style="width: ${axisResult.confidencePercent}%"></div>
                  </div>
                  <p class="muted">${axisResult.note}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container content-grid">
        <article class="card result-summary">
          <span class="badge">Сильные стороны</span>
          <h2>Что у этого типа обычно работает лучше всего</h2>
          <ul class="card-list">
            ${currentType.strengths.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>

        <article class="card result-summary">
          <span class="badge badge--soft">Зоны роста</span>
          <h3 class="card-title">Что помогает держать баланс</h3>
          <ul class="card-list">
            ${currentType.growthAdvice.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="container result-grid">
        <article class="card">
          <span class="badge badge--soft">Группа MBTI</span>
          <h2>${currentGroup?.title ?? ""} / ${currentGroup?.label ?? ""}</h2>
          <p class="muted">${currentGroup?.idea ?? ""}</p>
          <a class="link-inline" href="/groups/">Открыть классификацию</a>
        </article>

        <article class="card">
          <span class="badge">Как с вами общаться</span>
          <h2>Рекомендации по контакту</h2>
          <ul class="card-list">
            ${currentType.communicationTips.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="container result-grid">
        <article class="card">
          <span class="badge">Подходящие сочетания</span>
          <p class="muted">Шкала совместимости: от 1 до 7, где 7 означает самый лёгкий и естественный контакт.</p>
          <div class="compat-grid">
            ${topMatches
              .map(({ type, score }) => {
                const note =
                  compatibility.pairNotes[getPairKey(currentType.code, type.code)]?.text ??
                  buildFallbackMatchNote(currentType, type, score);
                const meta = getCompatibilityMeta(score);

                return `
                  <article class="card result-match-card">
                    <div class="cluster">
                      <span class="${getGroupBadgeClass(type.group)}">${type.code}</span>
                      <span class="${meta.className}">${meta.shortLabel}</span>
                    </div>
                    <h3 class="card-title">${type.fullName}</h3>
                    <p class="muted">${note}</p>
                    <a class="link-inline" href="${getTypePath(type.code)}">Открыть тип</a>
                  </article>
                `;
              })
              .join("")}
          </div>
        </article>

        <article class="card">
          <span class="badge badge--soft">Сложные сочетания</span>
          <div class="result-challenge-list">
            ${difficultMatches
              .map(({ type, score }) => {
                const meta = getCompatibilityMeta(score);

                return `
                  <div class="result-challenge-item">
                    <div class="stack">
                      <div class="cluster">
                        <strong>${type.code} — ${type.fullName}</strong>
                        <span class="${meta.className}">${meta.shortLabel}</span>
                      </div>
                      <span class="muted">${buildFallbackMatchNote(currentType, type, score)}</span>
                    </div>
                    <a class="link-inline" href="${getTypePath(type.code)}">Открыть</a>
                  </div>
                `;
              })
              .join("")}
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Следующий шаг</span>
          <h2>После результата можно идти глубже в тип, совместимость и классификацию.</h2>
        </div>

        <div class="next-grid">
          <article class="card">
            <h3 class="card-title">Открыть свой тип подробно</h3>
            <p class="muted">Подробная страница типа уже готова и собирается из JSON-данных.</p>
            <a class="link-inline" href="${getTypePath(currentType.code)}">Перейти к ${currentType.code}</a>
          </article>
          <article class="card">
            <h3 class="card-title">Сравнить себя с другими</h3>
            <p class="muted">Каталог типов поможет быстро пройтись по соседним характерам и контрастам.</p>
            <a class="link-inline" href="/types/">Открыть каталог</a>
          </article>
          <article class="card">
            <h3 class="card-title">Посмотреть свою группу</h3>
            <p class="muted">Группа помогает быстро понять общий стиль мышления и взаимодействия.</p>
            <a class="link-inline" href="/groups/">Открыть классификацию</a>
          </article>
        </div>
      </div>
    </section>
  `;

  bindResultEvents();
}

function renderEmptyResultState() {
  document.title = "Результат MBTI — АнонЧ";

  pageHost.innerHTML = `
    <section class="section">
      <div class="container-wide">
        <article class="card card--soft result-empty">
          <span class="badge">Результат пока пуст</span>
          <h1>Сохранённого результата MBTI пока нет.</h1>
          <p class="lead">
            Начните тест, ответьте на все 22 вопроса и получите отдельную страницу результата с типом, балансом по осям и совместимостью.
          </p>
          <div class="cluster">
            <a class="btn btn--primary" href="/test/">Перейти к тесту</a>
            <a class="btn btn--secondary" href="/types/">Пока открыть типы</a>
          </div>
        </article>
      </div>
    </section>
  `;
}

function bindResultEvents() {
  const retakeButton = pageHost.querySelector("[data-retake-result]");

  if (!retakeButton) {
    return;
  }

  retakeButton.addEventListener("click", () => {
    const confirmed = window.confirm("Сбросить текущий результат и начать тест заново?");

    if (!confirmed) {
      return;
    }

    mbtiService.startRetake();
    window.location.assign("/test/?retake=1");
  });
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
