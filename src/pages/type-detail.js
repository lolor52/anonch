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
import { createMbtiService } from "../features/mbti/mbti-service.js";

const pageHost = document.querySelector("[data-type-detail-page]");
const mbtiService = createMbtiService();

if (pageHost) {
  initTypeDetailPage().catch((error) => {
    console.error(error);
    renderNotice(pageHost, "Не удалось загрузить страницу типа.");
  });
}

async function initTypeDetailPage() {
  const [types, categories, compatibility] = await Promise.all([
    loadJson("types"),
    loadJson("categories"),
    loadJson("compatibility"),
  ]);
  const currentResult = safeGetCurrentResult();

  const typeCode = document.body.dataset.typeCode;
  const currentType = typeCode ? getTypeByCode(types, typeCode.toUpperCase()) : null;

  if (!currentType) {
    renderTemplateState();
    return;
  }

  const currentGroup = getGroupByCode(categories, currentType.group);
  const strongMatches = currentType.strongMatches
    .map((code) => getTypeByCode(types, code))
    .filter(Boolean);
  const difficultMatches = currentType.difficultMatches
    .map((code) => getTypeByCode(types, code))
    .filter(Boolean);
  const itemsByCode = new Map(types.items.map((type) => [type.code, type]));
  const orderedTypes = (types.order ?? []).map((code) => itemsByCode.get(code)).filter(Boolean);
  const fullCompatibility = orderedTypes
    .filter((type) => type.code !== currentType.code)
    .map((type) => {
      const score = compatibility.matrix[currentType.code][type.code];

      return {
        type,
        score,
        note:
          compatibility.pairNotes[getPairKey(currentType.code, type.code)]?.text ??
          buildFallbackMatchNote(currentType, type, score),
      };
    })
    .sort((left, right) => right.score - left.score || left.type.code.localeCompare(right.type.code));
  const savedTypeCode = currentResult?.typeCode ?? null;

  document.title = `${currentType.code} — ${currentType.fullName} | MBTI — АнонЧ`;

  pageHost.innerHTML = `
    <section class="section hero">
      <div class="container-wide hero-grid type-hero">
        <div class="stack-lg">
          <div class="cluster">
            <span class="${getGroupBadgeClass(currentType.group)}">${currentType.code}</span>
            <span class="badge badge--soft">${currentGroup?.title ?? ""}</span>
            <span class="badge badge--soft">${currentGroup?.label ?? ""}</span>
            ${savedTypeCode === currentType.code ? '<span class="badge badge--warm">ваш сохранённый тип</span>' : ""}
          </div>
          <div class="stack">
            <h1>${currentType.code} — ${currentType.fullName}</h1>
            <p class="lead">${currentType.shortDescription}</p>
          </div>
          <div class="cluster">
            <a class="btn btn--primary" href="/result/">Открыть результат</a>
            <a class="btn btn--secondary" href="/types/">Вернуться в каталог</a>
          </div>
        </div>

        <article class="card card--soft">
          <span class="badge badge--warm">Группа</span>
          <h2 class="card-title">${currentGroup?.title ?? ""} / ${currentGroup?.label ?? ""}</h2>
          <p class="muted">${currentGroup?.idea ?? ""}</p>
          <a class="link-inline" href="/groups/">Открыть классификацию</a>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="container detail-facet-grid">
        ${renderFacetCard("Дружба", currentType.friendship)}
        ${renderFacetCard("Романтика", currentType.romance)}
        ${renderFacetCard("Рабочий стиль", currentType.workStyle)}
      </div>
    </section>

    <section class="section">
      <div class="container content-grid">
        <article class="card">
          <span class="badge">Сильные стороны</span>
          <h2>Что у этого типа обычно получается лучше всего</h2>
          <ul class="card-list">
            ${currentType.strengths.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>

        <article class="card">
          <span class="badge badge--warm">Сложные места</span>
          <h2>Где чаще всего появляется напряжение</h2>
          <ul class="card-list">
            ${currentType.weaknesses.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="container detail-support-grid">
        <article class="card">
          <span class="badge">Подарки</span>
          <h2>Что обычно отзывается</h2>
          <ul class="card-list">
            ${currentType.giftIdeas.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>

        <article class="card">
          <span class="badge badge--soft">Как общаться</span>
          <h2>Подсказки для контакта</h2>
          <ul class="card-list">
            ${currentType.communicationTips.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>

        <article class="card">
          <span class="badge badge--warm">Рост</span>
          <h2>Что помогает двигаться дальше</h2>
          <ul class="card-list">
            ${currentType.growthAdvice.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="container section-grid">
        <article class="card">
          <span class="badge">Сильные сочетания</span>
          <h2>Кто часто даёт хороший баланс</h2>
          <div class="match-list">
            ${renderMatches(currentType, strongMatches, compatibility)}
          </div>
        </article>

        <article class="card">
          <span class="badge badge--soft">Сложные сочетания</span>
          <h2>Где чаще нужен особый такт</h2>
          <div class="match-list">
            ${renderMatches(currentType, difficultMatches, compatibility)}
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head section-head--inline">
          <div class="stack">
            <span class="eyebrow">Совместимость 1–7</span>
            <h2>Полная шкала совместимости с остальными типами.</h2>
          </div>
          <p class="muted">7 означает самый лёгкий контакт, а диапазон 1–3 обычно требует больше такта и согласования.</p>
        </div>

        <div class="compatibility-catalog">
          ${fullCompatibility
            .map(({ type, score, note }) => {
              const meta = getCompatibilityMeta(score);

              return `
                <article class="card compatibility-item">
                  <div class="compatibility-item-head">
                    <div class="cluster">
                      <span class="${getGroupBadgeClass(type.group)}">${type.code}</span>
                      <a class="link-inline" href="${getTypePath(type.code)}">${type.fullName}</a>
                    </div>
                    <span class="${meta.className}">${meta.shortLabel}</span>
                  </div>
                  <p class="muted">${note}</p>
                </article>
              `;
            })
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderTemplateState() {
  document.title = "Шаблон типа MBTI — АнонЧ";
  pageHost.innerHTML = `
    <section class="section hero">
      <div class="container-wide hero-grid type-hero">
        <div class="stack-lg">
          <div class="cluster">
            <span class="badge">XXXX</span>
            <span class="badge badge--soft">Шаблон</span>
          </div>
          <div class="stack">
            <h1>Универсальный шаблон страницы типа</h1>
            <p class="lead">Если код типа не передан, страница остаётся общим примером и показывает базовый каркас.</p>
          </div>
          <div class="cluster">
            <a class="btn btn--primary" href="/types/">Открыть каталог</a>
            <a class="btn btn--secondary" href="/result/">Открыть результат</a>
          </div>
        </div>

        <article class="card card--soft">
          <span class="badge badge--warm">Назначение</span>
          <h2 class="card-title">Один шаблон покрывает все 16 страниц.</h2>
          <p class="muted">Здесь собирается полная страница типа: описание, группа и совместимость.</p>
        </article>
      </div>
    </section>
  `;
}

function renderFacetCard(title, text) {
  return `
    <article class="card detail-facet-card">
      <span class="badge badge--soft">${title}</span>
      <p class="muted">${text}</p>
    </article>
  `;
}

function renderMatches(currentType, matchTypes, compatibility) {
  return matchTypes
    .map((type) => {
      const score = compatibility.matrix[currentType.code][type.code];
      const note =
        compatibility.pairNotes[getPairKey(currentType.code, type.code)]?.text ??
        buildFallbackMatchNote(currentType, type, score);
      const meta = getCompatibilityMeta(score);

      return `
        <article class="match-item">
          <div class="compatibility-item-head">
            <div class="cluster">
              <span class="${getGroupBadgeClass(type.group)}">${type.code}</span>
              <a class="link-inline" href="${getTypePath(type.code)}">${type.fullName}</a>
            </div>
            <span class="${meta.className}">${meta.shortLabel}</span>
          </div>
          <p class="muted">${note}</p>
        </article>
      `;
    })
    .join("");
}

function safeGetCurrentResult() {
  try {
    return mbtiService.getResult();
  } catch (error) {
    console.error("[type-detail] Не удалось прочитать сохранённый результат.", error);
    return null;
  }
}
