const SITE_NAME = "АнонЧ";
const SITE_DESCRIPTION = "Спокойный сайт про MBTI: тест, 16 типов, 4 группы и совместимость.";
const SITE_LANGUAGE = "ru-RU";
const LOGO_PATH = "/media/logo.png";
const MANIFEST_PATH = "/site.webmanifest";
const THEME_COLOR = "#173a3c";

export function updateSeoMetadata(options = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const title = String(options.title ?? document.title).trim();
  const description = String(options.description ?? readMeta("description") ?? SITE_DESCRIPTION).trim();
  const canonicalUrl = buildAbsoluteUrl(options.canonicalPath ?? normalizePath(window.location.pathname));
  const robotsValue = normalizeRobotsContent(options.robots ?? readMeta("robots"), options.indexable);
  const pageKey = document.body?.dataset.page ?? "";
  const indexable = !robotsValue.includes("noindex");
  const ogType = options.ogType ?? (pageKey === "home" ? "website" : "article");

  document.title = title;
  setMeta({ name: "description", content: description });
  setMeta({ name: "robots", content: robotsValue });
  setMeta({ name: "theme-color", content: THEME_COLOR });

  setLink({ rel: "canonical", href: canonicalUrl });
  setLink({ rel: "icon", href: LOGO_PATH, type: "image/png", sizes: "283x283" });
  setLink({ rel: "apple-touch-icon", href: LOGO_PATH });
  setLink({ rel: "manifest", href: MANIFEST_PATH });

  setMeta({ property: "og:locale", content: "ru_RU" });
  setMeta({ property: "og:site_name", content: SITE_NAME });
  setMeta({ property: "og:type", content: ogType });
  setMeta({ property: "og:title", content: title });
  setMeta({ property: "og:description", content: description });
  setMeta({ property: "og:url", content: canonicalUrl });
  setMeta({ property: "og:image", content: buildAbsoluteUrl(LOGO_PATH) });
  setMeta({ property: "og:image:alt", content: `Логотип ${SITE_NAME}` });

  setMeta({ name: "twitter:card", content: "summary" });
  setMeta({ name: "twitter:title", content: title });
  setMeta({ name: "twitter:description", content: description });
  setMeta({ name: "twitter:image", content: buildAbsoluteUrl(LOGO_PATH) });

  if (indexable) {
    setStructuredData(buildStructuredData({ pageKey, title, description, canonicalUrl, schemaType: options.schemaType }));
    return;
  }

  removeStructuredData();
}

function buildStructuredData({ pageKey, title, description, canonicalUrl, schemaType }) {
  const homeUrl = buildAbsoluteUrl("/");
  const websiteId = `${homeUrl}#website`;
  const organizationId = `${homeUrl}#organization`;
  const pageType = schemaType ?? resolveSchemaType(pageKey);

  if (pageKey === "home") {
    return [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        url: homeUrl,
        logo: buildAbsoluteUrl(LOGO_PATH),
        image: buildAbsoluteUrl(LOGO_PATH),
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": websiteId,
        url: homeUrl,
        name: SITE_NAME,
        description,
        inLanguage: SITE_LANGUAGE,
        publisher: {
          "@id": organizationId,
        },
      },
    ];
  }

  return [
    {
      "@context": "https://schema.org",
      "@type": pageType,
      url: canonicalUrl,
      name: title,
      description,
      inLanguage: SITE_LANGUAGE,
      isPartOf: {
        "@id": websiteId,
      },
      image: buildAbsoluteUrl(LOGO_PATH),
    },
  ];
}

function resolveSchemaType(pageKey) {
  if (document.body?.dataset.typeCode) {
    return "AboutPage";
  }

  if (pageKey === "types" || pageKey === "groups") {
    return "CollectionPage";
  }

  return "WebPage";
}

function normalizeRobotsContent(currentValue, indexableOverride) {
  const values = new Set(
    String(currentValue ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
  const indexable = indexableOverride ?? !values.has("noindex");

  values.delete(indexable ? "noindex" : "index");
  values.add(indexable ? "index" : "noindex");

  if (!values.has("follow") && !values.has("nofollow")) {
    values.add("follow");
  }

  if (![...values].some((item) => item.startsWith("max-image-preview:"))) {
    values.add("max-image-preview:large");
  }

  return [...values].join(",");
}

function normalizePath(pathname) {
  const cleanPath = String(pathname ?? "/").replace(/index\.html$/, "");

  if (!cleanPath || cleanPath === "/") {
    return "/";
  }

  return cleanPath.endsWith("/") ? cleanPath : `${cleanPath}/`;
}

function buildAbsoluteUrl(pathname) {
  return new URL(pathname, window.location.origin).toString();
}

function readMeta(name) {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? "";
}

function setMeta(attributes) {
  const selector = attributes.name
    ? `meta[name="${attributes.name}"]`
    : `meta[property="${attributes.property}"]`;
  const element = document.head.querySelector(selector) ?? document.createElement("meta");

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  if (!element.isConnected) {
    document.head.append(element);
  }
}

function setLink(attributes) {
  const selector = `link[rel="${attributes.rel}"]`;
  const element = document.head.querySelector(selector) ?? document.createElement("link");

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  if (!element.isConnected) {
    document.head.append(element);
  }
}

function setStructuredData(payload) {
  const element =
    document.head.querySelector('script[type="application/ld+json"][data-seo-structured]') ??
    document.createElement("script");

  element.type = "application/ld+json";
  element.dataset.seoStructured = "true";
  element.textContent = JSON.stringify(payload);

  if (!element.isConnected) {
    document.head.append(element);
  }
}

function removeStructuredData() {
  document.head.querySelector('script[type="application/ld+json"][data-seo-structured]')?.remove();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    updateSeoMetadata();
  });
} else {
  updateSeoMetadata();
}
