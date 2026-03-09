import { createAuthManager } from "./auth-manager.js";

const AUTH_MESSAGES = Object.freeze({
  "auth-required": "Сначала войдите, чтобы открыть тест и личный результат.",
  "signed-out": "Вы вышли из профиля. Чтобы продолжить, войдите снова.",
  "session-error": "Не удалось восстановить сессию. Войдите в профиль заново.",
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

  if (!rawTarget) {
    return defaultPath;
  }

  if (!rawTarget.startsWith("/") || rawTarget.startsWith("//")) {
    return defaultPath;
  }

  return rawTarget;
}

export function redirectAfterAuth() {
  window.location.assign(resolveRedirectTarget("/test/"));
}

export function redirectToAuth(messageCode) {
  const currentPath = `${normalizePath(window.location.pathname)}${window.location.search}`;
  const authUrl = new URL("/auth/", window.location.origin);
  authUrl.searchParams.set("redirect", currentPath);

  if (messageCode) {
    authUrl.searchParams.set("message", messageCode);
  }

  window.location.replace(authUrl.toString());
}

function normalizePath(pathname) {
  const withoutIndex = pathname.replace(/index\.html$/, "");
  return withoutIndex.endsWith("/") ? withoutIndex : `${withoutIndex}/`;
}
