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

const LAZY_COMPONENTS = {
  DocumentEditor: () => import("./editor/index.ts"),
};

function extractDataProps(mountPoint) {
  const props = {};
  const attrs = mountPoint.attributes;
  
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (attr.name.startsWith("data-") && attr.name !== "data-component") {
      const propName = attr.name
        .replace(/^data-/, "")
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      
      let value = attr.value;
      if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (!isNaN(value) && value !== "") value = Number(value);
      
      props[propName] = value;
    }
  }
  
  return props;
}

function mountComponent(mountPoint, ComponentToRender, props = {}) {
  try {
    const root = ReactDOM.createRoot(mountPoint);
    root.render(
      React.createElement(ComponentToRender, {
        ...props,
        mountElement: mountPoint,
      })
    );
  } catch (err) {
    console.error(`[react-bridge] Error al montar componente:`, err);
  }
}

function initReactBridge() {
  const mountPoints = document.querySelectorAll(".react-mount");

  mountPoints.forEach(async (mountPoint) => {
    const componentName = mountPoint.getAttribute("data-component");
    const dataProps = extractDataProps(mountPoint);

    const StaticComponent = COMPONENTS[componentName];
    if (StaticComponent) {
      mountComponent(mountPoint, StaticComponent, dataProps);
      return;
    }

    const lazyLoader = LAZY_COMPONENTS[componentName];
    if (lazyLoader) {
      try {
        const module = await lazyLoader();
        const LazyComponent = module.default || module[componentName];
        if (LazyComponent) {
          mountComponent(mountPoint, LazyComponent, dataProps);
        } else {
          console.error(`[react-bridge] Componente lazy "${componentName}" no encontrado en el módulo`);
          mountPoint.innerHTML = '<p style="color:#a1a1aa;">Componente no disponible.</p>';
        }
      } catch (err) {
        console.error(`[react-bridge] Error al cargar componente lazy "${componentName}":`, err);
        mountPoint.innerHTML = '<p style="color:#a1a1aa;">Error al cargar componente.</p>';
      }
      return;
    }

    console.error(`[react-bridge] Componente "${componentName}" no registrado`);
    mountPoint.innerHTML = '<p style="color:#a1a1aa;">Componente no disponible.</p>';
  });
}

if (window.ContentFlowApp) {
  initReactBridge();
} else {
  window.addEventListener("ContentFlowReady", initReactBridge, { once: true });
}