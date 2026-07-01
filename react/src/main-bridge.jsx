import React from "react";
import ReactDOM from "react-dom/client";
import { MetricsPanel } from "./MetricsPanel";
import { SmartDocumentList } from "./SmartDocumentList";
import UserProfileManager from "./UserProfileManager";

const COMPONENTS = {
  MetricsPanel,
  SmartDocumentList,
  UserProfileManager,
};

function initReactBridge() {
  const mountPoints = document.querySelectorAll(".react-mount");

  mountPoints.forEach((mountPoint) => {
    const componentName = mountPoint.getAttribute("data-component");
    const ComponentToRender = COMPONENTS[componentName];

    if (!ComponentToRender) {
      console.error(`[react-bridge] Componente "${componentName}" no registrado`);
      mountPoint.innerHTML = '<p style="color:#a1a1aa;">Componente no disponible.</p>';
      return;
    }

    try {
      ReactDOM.createRoot(mountPoint).render(<ComponentToRender />);
    } catch (err) {
      console.error(`[react-bridge] Error al montar "${componentName}":`, err);
    }
  });
}

if (window.ContentFlowApp) {
  initReactBridge();
} else {
  document.addEventListener("ContentFlowReady", initReactBridge, { once: true });
}