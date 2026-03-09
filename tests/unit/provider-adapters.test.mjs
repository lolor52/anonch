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

function createManagerWithConfigs(providerConfigs) {
  return createAuthManager({
    storage: createMemoryStorage(),
    providerConfigs,
    logger: {
      info() {},
      error() {},
    },
    now: () => "2026-03-09T10:00:00.000Z",
    idGenerator: () => "user_1",
  });
}

test("пустая real-конфигурация VK и Yandex помечается как неготовая", () => {
  const authManager = createManagerWithConfigs([
    { key: "local", label: "Локально", mode: "enabled" },
    {
      key: "vk",
      label: "VK ID",
      mode: "real",
      appId: "",
      redirectUri: "",
      origins: { allowedAppOrigins: ["http://127.0.0.1:4173"] },
      featureFlags: { enableRealAuth: true },
    },
    {
      key: "yandex",
      label: "Yandex ID",
      mode: "real",
      clientId: "",
      redirectUri: "",
      origins: { allowedAppOrigins: ["http://127.0.0.1:4173"] },
      featureFlags: { enableRealAuth: true },
    },
  ]);

  const statuses = authManager.listProviderStatuses();
  const vkStatus = statuses.find((item) => item.key === "vk");
  const yandexStatus = statuses.find((item) => item.key === "yandex");

  assert.equal(vkStatus.ready, false);
  assert.equal(yandexStatus.ready, false);
  assert.match(vkStatus.description, /Заполните appId, redirectUri/);
  assert.match(yandexStatus.description, /Заполните clientId, redirectUri/);
});

test("signInWithProvider даёт понятную ошибку при пустой real-конфигурации", async () => {
  const authManager = createManagerWithConfigs([
    { key: "local", label: "Локально", mode: "enabled" },
    {
      key: "vk",
      label: "VK ID",
      mode: "real",
      appId: "",
      redirectUri: "",
      origins: { allowedAppOrigins: ["http://127.0.0.1:4173"] },
      featureFlags: { enableRealAuth: true },
    },
    {
      key: "yandex",
      label: "Yandex ID",
      mode: "real",
      clientId: "",
      redirectUri: "",
      origins: { allowedAppOrigins: ["http://127.0.0.1:4173"] },
      featureFlags: { enableRealAuth: true },
    },
  ]);

  await assert.rejects(() => authManager.signInWithProvider("vk"), /VK ID не настроен/);
  await assert.rejects(() => authManager.signInWithProvider("yandex"), /Yandex ID не настроен/);
});

test("mock-режим Yandex создаёт такой же локальный профиль, как и local auth", async () => {
  const authManager = createManagerWithConfigs([
    { key: "local", label: "Локально", mode: "enabled" },
    {
      key: "vk",
      label: "VK ID",
      mode: "disabled",
      origins: { allowedAppOrigins: ["http://127.0.0.1:4173"] },
      featureFlags: { enableRealAuth: true },
    },
    {
      key: "yandex",
      label: "Yandex ID",
      mode: "mock",
      origins: { allowedAppOrigins: ["http://127.0.0.1:4173"] },
      featureFlags: { enableRealAuth: true },
      mockProfile: {
        username: "yandex_demo_masha",
        displayName: "Маша из Yandex",
        avatar: "",
      },
    },
  ]);

  const user = await authManager.signInWithProvider("yandex");

  assert.equal(user.authProvider, "yandex");
  assert.equal(user.username, "yandex_demo_masha");
  assert.equal(authManager.restoreSession()?.id, user.id);
});
