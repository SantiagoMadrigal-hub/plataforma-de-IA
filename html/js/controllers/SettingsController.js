// js/controllers/settings.controller.js

export const SettingsController = {
    init: async function () {
        const settings = await window.ContentFlowApp.state.settings.get();

        if (!settings) {
            const defaultSettings = {
                theme: 'light',
                aiModel: 'default',
                notifications: true
            };
            await window.ContentFlowApp.state.settings.set(defaultSettings);
            console.log("Configuraciones inicializadas por defecto.");
        }

        this._updateCreditsBar();
    },

    _updateCreditsBar: function () {
        const fill = document.querySelector(".credits-bar-fill");
        if (!fill) return;

        const pct = parseInt(fill.getAttribute("style")?.match(/width:\s*(\d+)/)?.[1] || fill.style.width || "0", 10);

        let level = "high";
        if (pct <= 20) level = "low";
        else if (pct <= 50) level = "medium";

        fill.setAttribute("data-level", level);
    }
};