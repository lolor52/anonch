const DATA_ROOT = "/public/data";
const cache = new Map();

export async function loadJson(name) {
  if (!cache.has(name)) {
    cache.set(
      name,
      fetch(`${DATA_ROOT}/${name}.json`).then((response) => {
        if (!response.ok) {
          throw new Error(`Не удалось загрузить ${name}.json`);
        }

        return response.json();
      })
    );
  }

  return cache.get(name);
}

export function getTypePath(code) {
  return `/types/${String(code).toLowerCase()}/`;
}

export function getPairKey(left, right) {
  return [left, right].sort().join(":");
}

export function getGroupByCode(categories, groupCode) {
  return categories.items.find((item) => item.code === groupCode);
}

export function getTypeByCode(types, code) {
  return types.items.find((item) => item.code === code);
}

export function readSearchParam(name) {
  return new URL(window.location.href).searchParams.get(name);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function renderNotice(host, message) {
  if (!host) {
    return;
  }

  host.innerHTML = `<div class="notice">${message}</div>`;
}

export function getGroupBadgeClass(groupCode) {
  return groupCode === "diplomats" || groupCode === "explorers" ? "badge badge--warm" : "badge";
}

export function getPreviewProfile(uiCopy, code) {
  return (
    uiCopy.resultPreview.profiles[code] ??
    uiCopy.resultPreview.profiles[uiCopy.resultPreview.defaultType]
  );
}

export function buildFallbackMatchNote(currentType, otherType, score) {
  if (score >= 6) {
    return `${otherType.fullName} часто хорошо сочетается с ${currentType.fullName.toLowerCase()} по темпу и приоритетам.`;
  }

  if (score <= 3) {
    return `У ${currentType.fullName.toLowerCase()} и ${otherType.fullName.toLowerCase()} часто расходятся ритм и ожидания от контакта.`;
  }

  return `${currentType.fullName} и ${otherType.fullName.toLowerCase()} обычно дают рабочий баланс без резкой полярности.`;
}

export function getCompatibilityMeta(score) {
  if (score >= 7) {
    return {
      label: "Очень высокая",
      className: "compatibility-badge compatibility-badge--very-high",
      shortLabel: "7/7",
    };
  }

  if (score >= 6) {
    return {
      label: "Высокая",
      className: "compatibility-badge compatibility-badge--high",
      shortLabel: `${score}/7`,
    };
  }

  if (score >= 4) {
    return {
      label: "Умеренная",
      className: "compatibility-badge compatibility-badge--medium",
      shortLabel: `${score}/7`,
    };
  }

  return {
    label: "Сложная",
    className: "compatibility-badge compatibility-badge--low",
    shortLabel: `${score}/7`,
  };
}
