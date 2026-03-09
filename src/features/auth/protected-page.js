import { ensureAuthenticated, isProtectedRoute } from "./page-guard.js";

if (typeof window !== "undefined" && isProtectedRoute()) {
  ensureAuthenticated();
}
