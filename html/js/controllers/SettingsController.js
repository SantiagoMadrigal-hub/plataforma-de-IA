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
        this._initPasswordToggles();
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

    _initPasswordToggles: function () {
        document.querySelectorAll('.password-toggle').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var input = document.getElementById(this.getAttribute('data-toggle'));
                if (!input) return;
                var isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                this.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
                this.querySelector('svg').innerHTML = isPassword
                    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
                    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
            });
        });
    },

    _initForms: function () {
        var self = this;
        var forms = document.querySelectorAll('.settings-panel .form');
        forms.forEach(function (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();

                // Security form: validate passwords
                if (form.querySelector('#new-password')) {
                    var current = form.querySelector('#current-password');
                    var newPw = form.querySelector('#new-password');
                    var confirmPw = form.querySelector('#confirm-password');

                    form.querySelectorAll('.form-input.is-error').forEach(function (i) { i.classList.remove('is-error'); });

                    if (!current.value.trim()) {
                        current.classList.add('is-error');
                        current.focus();
                        self._showToast('Debes ingresar tu contraseña actual', 'error');
                        return;
                    }
                    if (newPw.value.length < 8) {
                        newPw.classList.add('is-error');
                        newPw.focus();
                        self._showToast('La nueva contraseña debe tener al menos 8 caracteres', 'error');
                        return;
                    }
                    if (newPw.value !== confirmPw.value) {
                        confirmPw.classList.add('is-error');
                        confirmPw.focus();
                        self._showToast('Las contraseñas nuevas no coinciden', 'error');
                        return;
                    }
                }

                var btn = form.querySelector('button[type="submit"]');
                if (!btn || btn.disabled) return;
                btn.disabled = true;
                btn.classList.add('btn-loading');

                try {
                    await new Promise(function (r) { setTimeout(r, 800); });
                    var msg = form.querySelector('#new-password') ? 'Contraseña actualizada correctamente' : 'Cambios guardados correctamente';
                    self._showToast(msg, 'success');
                    form.querySelectorAll('.form-input.is-error').forEach(function (i) { i.classList.remove('is-error'); });
                    if (form.querySelector('#new-password')) {
                        form.reset();
                    }
                } catch (err) {
                    self._showToast(err.message || 'Error al guardar', 'error');
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