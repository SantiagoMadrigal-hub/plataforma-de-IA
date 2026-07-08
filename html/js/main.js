import { LocalStorageAdapter } from "./services/storage.adapter.js";
import { Repository } from "./services/repository.js";
import { AuthService } from "./services/auth.service.js";
import { DocumentService } from "./services/document.service.js";
import { AIService } from "./services/ai.service.js";
import { FormController } from "./controllers/form.controller.js";
import { AuthController } from "./controllers/auth.controller.js";
import { DocumentController } from "./controllers/document.controller.js";
import { SettingsController } from "./controllers/SettingsController.js";
import { ChatController } from "./controllers/chat.controller.js";

/** @typedef {import('./services/auth.service.js').AuthService} AuthService */
/** @typedef {import('./services/document.service.js').DocumentService} DocumentService */
/** @typedef {import('./services/ai.service.js').AIService} AIService */

/**
 * @typedef {Object} AppState
 * @property {Repository} settings
 */

/**
 * @typedef {Object} AppServices
 * @property {AuthService} auth
 * @property {DocumentService} documents
 * @property {AIService} ai
 */

/**
 * @typedef {Object} ContentFlowApp
 * @property {AppState} state
 * @property {AppServices} services
 */

document.addEventListener("DOMContentLoaded", async function () {
  const storage = new LocalStorageAdapter();

  /** @type {AppState} */
  const appState = {
    settings: new Repository(storage, "contentflow.settings"),
  };

  await appState.settings.init();

  const stored = await appState.settings.get();
  if (stored) {
    let changed = false;
    if (!stored.groqKey && typeof GROQ_API_KEY !== 'undefined') {
      stored.groqKey = GROQ_API_KEY;
      changed = true;
    }
    if (changed) await appState.settings.set(stored);
  }

  const authService = new AuthService();
  const docService = new DocumentService();

  await authService.init();

  /** @type {AppServices} */
  const services = {
    auth: authService,
    documents: docService,
    ai: new AIService(appState.settings, docService),
  };

  /** @type {ContentFlowApp} */
  window.ContentFlowApp = { state: appState, services: services };

  import("../js/react-bridge.js").catch(function (err) {
    console.error("Error al cargar React:", err);
  });

  window.dispatchEvent(new Event("ContentFlowReady"));

  await Promise.all([
    FormController.init(),
    AuthController.init(),
    DocumentController.init(),
    SettingsController.init(),
    ChatController.init(),
  ]);

  AOS.init({
    duration: 600,
    once: true,
  });

  const glideEl = document.querySelector(".glide");
  if (glideEl) {
    new Glide(".glide", {
      type: "carousel",
      autoplay: 4000,
    }).mount();
  }

  MicroModal.init({
    awaitCloseAnimation: true,
    onShow: function (modal) {
      modal.setAttribute("aria-hidden", "false");
    },
    onClose: function (modal) {
      modal.setAttribute("aria-hidden", "true");
    },
  });

  console.log("App inicializada con backend API.");
});
