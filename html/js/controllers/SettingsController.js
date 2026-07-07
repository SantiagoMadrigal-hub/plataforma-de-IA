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
        this._initForms();
    },

    _updateCreditsBar: function () {
        const fill = document.querySelector(".credits-bar-fill");
        if (!fill) return;

        const pct = parseInt(fill.getAttribute("style")?.match(/width:\s*(\d+)/)?.[1] || fill.style.width || "0", 10);

        let level = "high";
        if (pct <= 20) level = "low";
        else if (pct <= 50) level = "medium";

        fill.setAttribute("data-level", level);
    },

    _initForms: function () {
        const forms = document.querySelectorAll('.settings-panel .form');
        forms.forEach(function (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                var btn = form.querySelector('button[type="submit"]');
                if (!btn || btn.disabled) return;
                btn.disabled = true;
                btn.classList.add('btn-loading');

                try {
                    // Simular guardado (en producción: llamada API)
                    await new Promise(function (r) { setTimeout(r, 800); });
                    SettingsController._showToast('Cambios guardados correctamente', 'success');
                    form.querySelectorAll('.form-input').forEach(function (i) { i.classList.remove('is-error'); });
                } catch (err) {
                    SettingsController._showToast(err.message || 'Error al guardar', 'error');
                } finally {
                    btn.disabled = false;
                    btn.classList.remove('btn-loading');
                }
            });
        });
    },

    _showToast: function (message, type) {
        type = type || 'info';
        var container = document.querySelector('.toast-container');
        if (!container) return;

        var toast = document.createElement('div');
        toast.className = 'toast toast--' + type;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(function () {
            toast.classList.add('toast-leaving');
            setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 200);
        }, 2500);
    }
};