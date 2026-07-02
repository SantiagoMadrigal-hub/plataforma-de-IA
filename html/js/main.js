import { LocalStorageAdapter } from "./services/storage.adapter.js";
import { Repository } from "./services/repository.js";
import { AuthService } from "./services/auth.service.js";
import { DocumentService } from "./services/document.service.js";
import { AIService } from "./services/ai.service.js";
import { FormController } from "./controllers/form.controller.js";
import { AuthController } from "./controllers/auth.controller.js";
import { DocumentController } from "./controllers/document.controller.js";
import { SettingsController } from "./controllers/SettingsController.js";
// react-bridge.js se importa dinámicamente dentro del handler (ver más abajo)

// Para migrar a Supabase:
// 1. Crea una tabla 'app_data' con columnas key (TEXT PK) y value (JSONB)
// 2. Reemplaza la línea de abajo con:
//    const storage = new SupabaseAdapter('https://tu-proyecto.supabase.co', 'tu-anon-key');
// 3. Importa SupabaseAdapter arriba:
//    import { SupabaseAdapter, LocalStorageAdapter } from './services/storage.adapter.js';

document.addEventListener("DOMContentLoaded", async function () {
  const storage = new LocalStorageAdapter();

  const appState = {
    auth: new Repository(storage, "contentflow.auth"),
    documents: new Repository(storage, "contentflow.documents"),
    settings: new Repository(storage, "contentflow.settings"),
  };

  await Promise.all([
    appState.auth.init(),
    appState.documents.init(),
    appState.settings.init(),
  ]);

  const stored = await appState.settings.get();
  if (stored) {
    let changed = false;
    if (!stored.groqKey && typeof GROQ_API_KEY !== 'undefined') {
      stored.groqKey = GROQ_API_KEY;
      changed = true;
    }
    if (changed) await appState.settings.set(stored);
  }

  const docService = new DocumentService(appState.documents);

  const services = {
    auth: new AuthService(appState.auth),
    documents: docService,
    ai: new AIService(appState.settings, docService),
  };

  window.ContentFlowApp = { state: appState, services: services };

  // Cargar React después de que ContentFlowApp está listo
  import("../js/react-bridge.js").catch(function (err) {
    console.error("Error al cargar React:", err);
  });

  window.dispatchEvent(new Event("ContentFlowReady"));

  await Promise.all([
    FormController.init(),
    AuthController.init(),
    DocumentController.init(),
    SettingsController.init(),
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

  // React se auto-inicializa via react-bridge.js (import arriba)
  console.log("Motor de React listo.");
});
