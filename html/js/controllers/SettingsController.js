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
        this._initPasswordStrength();
        this._initForms();
        this._initExport();
        this._initDeleteAccount();
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

    _initPasswordStrength: function () {
        var input = document.getElementById('new-password');
        var fill = document.getElementById('pw-strength-fill');
        var label = document.getElementById('pw-strength-label');
        if (!input || !fill || !label) return;

        input.addEventListener('input', function () {
            var v = this.value;
            var score = 0;
            if (v.length >= 8) score++;
            if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
            if (/\d/.test(v)) score++;
            if (/[^a-zA-Z0-9]/.test(v)) score++;

            var level = Math.min(score, 3);
            fill.setAttribute('data-strength', level);
            var texts = { 0: '', 1: 'Débil', 2: 'Media', 3: 'Fuerte' };
            label.textContent = texts[level] || '';
        });
    },

    _initExport: function () {
        var btn = document.getElementById('btn-export');
        var icon = document.getElementById('export-icon');
        var text = document.getElementById('export-text');
        if (!btn) return;

        btn.addEventListener('click', async function () {
            if (btn.disabled) return;
            btn.disabled = true;
            icon.innerHTML = '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>';
            text.textContent = 'Generando exportación...';

            try {
                await new Promise(function (r) { setTimeout(r, 1500); });
                var container = document.querySelector('.toast-container');
                if (container) {
                    var toast = document.createElement('div');
                    toast.className = 'toast toast--info';
                    toast.textContent = 'Recibirás tus datos por correo en unos minutos';
                    container.appendChild(toast);
                    setTimeout(function () { toast.classList.add('toast-leaving'); setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 200); }, 3500);
                }
            } finally {
                btn.disabled = false;
                icon.innerHTML = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>';
                text.textContent = 'Enviar mis datos por correo';
            }
        });
    },

    _initDeleteAccount: function () {
        var self = this;
        var modal = document.getElementById('confirm-delete');
        var deleteBtn = document.querySelector('.btn-danger--delete');
        var overlay = modal && modal.querySelector('.modal__overlay');
        var confirmInput = document.getElementById('confirm-delete-input');
        var confirmBtn = document.getElementById('confirm-delete-btn');
        var closeBtns = modal && modal.querySelectorAll('[data-delete-close]');
        if (!modal || !deleteBtn || !confirmInput || !confirmBtn) return;

        function show() { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
        function hide() { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); if (confirmInput) confirmInput.value = ''; if (confirmBtn) confirmBtn.disabled = true; }

        deleteBtn.addEventListener('click', show);

        if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) hide(); });
        closeBtns.forEach(function (b) { b.addEventListener('click', hide); });

        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('is-open')) hide(); });

        confirmInput.addEventListener('input', function () {
            confirmBtn.disabled = this.value.trim() !== 'ELIMINAR';
        });

        confirmBtn.addEventListener('click', async function () {
            if (this.disabled) return;
            this.disabled = true;
            this.classList.add('btn-loading');

            try {
                await new Promise(function (r) { setTimeout(r, 1200); });
                self._showToast('Cuenta eliminada (simulado)', 'info');
                hide();
            } catch (err) {
                self._showToast(err.message || 'Error al eliminar', 'error');
            } finally {
                this.disabled = false;
                this.classList.remove('btn-loading');
                confirmInput.value = '';
                confirmBtn.disabled = true;
            }
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