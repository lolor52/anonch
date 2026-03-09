import { createAuthManager } from "./auth-manager.js";

const DEFAULT_REDIRECT_TARGET = "/test/";

const AUTH_MESSAGES = Object.freeze({
  "auth-required": "Сначала войдите, чтобы открыть тест и личный результат.",
  "signed-out": "Вы вышли из профиля. Чтобы продолжить, войдите снова.",
  "session-error": "Не удалось восстановить вход. Войдите в профиль заново.",
});

export function ensureAuthenticated() {
  const authManager = createAuthManager();

  try {
    const user = authManager.restoreSession();

    if (user) {
      return user;
    }
  } catch (error) {
    console.error("[auth] Ошибка при проверке доступа.", error);
    redirectToAuth("session-error");
    return null;
  }

  redirectToAuth("auth-required");
  return null;
}

export function isProtectedRoute(pathname = window.location.pathname) {
  const normalizedPath = normalizePath(pathname);
  return normalizedPath === "/test/" || normalizedPath === "/result/";
}

export function getAuthMessage(messageCode) {
  return AUTH_MESSAGES[messageCode] ?? "";
}

export function resolveRedirectTarget(defaultPath = "/test/") {
  const currentUrl = new URL(window.location.href);
  const rawTarget = currentUrl.searchParams.get("redirect");

  return sanitizeRedirectTarget(rawTarget, defaultPath);
}

export function buildAuthDialogUrl({ redirectTarget = DEFAULT_REDIRECT_TARGET, messageCode = "" } = {}) {
  const authUrl = new URL("/", window.location.origin);
  authUrl.searchParams.set("auth", "modal");
  authUrl.searchParams.set("redirect", sanitizeRedirectTarget(redirectTarget, DEFAULT_REDIRECT_TARGET));

  if (messageCode) {
    authUrl.searchParams.set("message", messageCode);
  }

  return authUrl;
}

export function redirectAfterAuth() {
  window.location.assign(resolveRedirectTarget(DEFAULT_REDIRECT_TARGET));
}

export function redirectToAuth(messageCode) {
  const currentPath = `${normalizePath(window.location.pathname)}${window.location.search}`;
  const authUrl = buildAuthDialogUrl({ redirectTarget: currentPath, messageCode });
  window.location.replace(authUrl.toString());
}

function normalizePath(pathname) {
  const withoutIndex = pathname.replace(/index\.html$/, "");
  return withoutIndex.endsWith("/") ? withoutIndex : `${withoutIndex}/`;
}

function sanitizeRedirectTarget(rawTarget, defaultPath) {
  if (!rawTarget) {
    return defaultPath;
  }

  if (!rawTarget.startsWith("/") || rawTarget.startsWith("//")) {
    return defaultPath;
  }

  return rawTarget;
}
