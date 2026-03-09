import { buildAuthDialogUrl, resolveRedirectTarget } from "../features/auth/page-guard.js";

const pageHost = document.querySelector("[data-auth-page]");

if (pageHost) {
  initAuthLauncher();
}

function initAuthLauncher() {
  const currentUrl = new URL(window.location.href);
  const destination = buildAuthDialogUrl({
    redirectTarget: resolveRedirectTarget("/test/"),
    messageCode: currentUrl.searchParams.get("message") || "",
  });

  pageHost.innerHTML = `
    <section class="section">
      <div class="container auth-route">
        <article class="card card--soft auth-route-card">
          <span class="badge badge--warm">Вход перенесён в окно</span>
          <h1 class="card-title">Сейчас откроется модальное окно авторизации.</h1>
          <p class="muted">Если перенаправление не сработало автоматически, откройте окно входа вручную.</p>
          <a class="btn btn--primary" href="${destination.toString()}">Открыть окно входа</a>
        </article>
      </div>
    </section>
  `;

  window.location.replace(destination.toString());
}
