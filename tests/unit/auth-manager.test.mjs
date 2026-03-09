import test from "node:test";
import assert from "node:assert/strict";
import { createAuthManager } from "../../src/features/auth/auth-manager.js";

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

function createTestManager(storage = createMemoryStorage()) {
  let counter = 0;

  return createAuthManager({
    storage,
    logger: {
      info() {},
      error() {},
    },
    now: () => "2026-03-09T10:00:00.000Z",
    idGenerator: () => {
      counter += 1;
      return `user_${counter}`;
    },
  });
}

test("локальная регистрация создаёт профиль и сессию", () => {
  const authManager = createTestManager();
  const user = authManager.registerLocal({
    username: "alina",
    displayName: "Алина",
  });

  assert.equal(user.username, "alina");
  assert.equal(user.displayName, "Алина");
  assert.equal(user.authProvider, "local");
  assert.equal(authManager.getSession().isAuthenticated, true);
  assert.equal(authManager.restoreSession()?.id, user.id);
});

test("локальная регистрация запрещает пустые значения и дубли", () => {
  const authManager = createTestManager();

  assert.throws(
    () => {
      authManager.registerLocal({ username: "", displayName: "" });
    },
    /Укажите логин/
  );

  authManager.registerLocal({
    username: "alina",
    displayName: "Алина",
  });

  assert.throws(
    () => {
      authManager.registerLocal({ username: "Alina", displayName: "Другая Алина" });
    },
    /логин уже занят/
  );

  assert.throws(
    () => {
      authManager.registerLocal({ username: "alina-2", displayName: "алина" });
    },
    /имя уже занято/
  );
});

test("локальный вход обновляет сессию и находит пользователя по логину без учёта регистра", () => {
  const authManager = createTestManager();
  authManager.registerLocal({
    username: "alina",
    displayName: "Алина",
  });
  authManager.logout();

  const user = authManager.loginLocal({
    username: "ALINA",
  });

  assert.equal(user.username, "alina");
  assert.equal(authManager.getCurrentUser()?.displayName, "Алина");
});

test("mock-вход через внешний провайдер создаёт локальный профиль и сохраняет провайдера", async () => {
  const authManager = createTestManager();
  const user = await authManager.signInWithProvider("vk");

  assert.equal(user.authProvider, "vk");
  assert.equal(user.username, "vk_demo_alina");
  assert.equal(authManager.restoreSession()?.id, user.id);
});

test("logout очищает сессию и restoreSession возвращает null", () => {
  const authManager = createTestManager();
  authManager.registerLocal({
    username: "alina",
    displayName: "Алина",
  });

  authManager.logout();

  assert.equal(authManager.getSession().isAuthenticated, false);
  assert.equal(authManager.restoreSession(), null);
});
