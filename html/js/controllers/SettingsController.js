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

        await this._loadStats();
        this._updateCreditsBar();
        this._initPasswordToggles();
        this._initPasswordStrength();
        this._initCustomSelects();
        this._initForms();
        this._initExport();
        this._initDeleteAccount();
    },

    _loadStats: async function () {
        try {
            const profile = await window.ContentFlowApp.services.auth.getUserProfile();
            if (!profile) return;

            const stats = profile.stats || {};
            this._authProvider = profile.authProvider || 'email';

            const planEl = document.querySelector('.stat-card--plan .stat-value');
            if (planEl) planEl.textContent = profile.plan || 'Pro';

            const creditsEl = document.querySelector('.stat-card--credits .stat-value');
            if (creditsEl) {
                creditsEl.innerHTML = (stats.credits ?? 0) + ' <span class="stat-total">/ ' + (stats.creditsLimit ?? 0) + '</span>';
            }

            const barFill = document.querySelector('.credits-bar-fill');
            if (barFill) {
                var limit = stats.creditsLimit ?? 0;
                var pct = limit > 0 ? Math.min(100, Math.round(((stats.credits ?? 0) / limit) * 100)) : 0;
                barFill.style.width = pct + '%';
            }

            const dateEl = document.querySelector('.stat-card--date .stat-value');
            if (dateEl && stats.renewalDate) {
                dateEl.textContent = new Date(stats.renewalDate).toLocaleDateString('es-ES');
            }

            var nameInput = document.querySelector('#nombre');
            if (nameInput && profile.name) {
                nameInput.value = profile.name;
            }

            var emailInput = document.querySelector('#correo');
            if (emailInput && profile.email) {
                emailInput.value = profile.email;
            }

            var pwGroup = document.getElementById('delete-pw-group');
            if (pwGroup) {
                pwGroup.style.display = this._authProvider === 'google' ? 'none' : '';
            }
        } catch (err) {
            console.error('Error al cargar estadísticas:', err);
        }
    },

    _refreshUI: function (user) {
        if (!user) return;
        var nameEl = document.querySelector('.dropdown-user-name');
        var emailEl = document.querySelector('.dropdown-user-email');
        var badge = document.getElementById('credits-badge');
        if (nameEl) nameEl.textContent = user.name || 'Usuario';
        if (emailEl) emailEl.textContent = user.email || '';
        if (badge) badge.textContent = 'Créditos: ' + (user.stats?.credits ?? '—');
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
                    if (form.querySelector('#nombre')) {
                        var nameInput = form.querySelector('#nombre');
                        if (nameInput.value.trim()) {
                            await window.ContentFlowApp.services.auth.updateProfile({ name: nameInput.value.trim() });
                            await self._loadStats();
                        }
                    } else if (form.querySelector('#new-password')) {
                        await new Promise(function (r) { setTimeout(r, 800); });
                    }
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

    _initCustomSelects: function () {
        document.querySelectorAll('.cs-wrap').forEach(function (wrap) {
            var trigger = wrap.querySelector('.cs-trigger');
            var dropdown = wrap.querySelector('.cs-dropdown');
            var search = wrap.querySelector('.cs-search');
            var options = wrap.querySelectorAll('.cs-option');
            var native = wrap.querySelector('select');
            if (!trigger || !dropdown || !options.length) return;

            var selected = wrap.querySelector('.cs-option[aria-selected="true"]');
            var valueEl = wrap.querySelector('.cs-value');

            function open() {
                wrap.setAttribute('aria-expanded', 'true');
                if (search) { search.focus(); search.select(); }
                document.addEventListener('mousedown', closeOutside);
                document.addEventListener('keydown', handleKey);
            }

            function close() {
                wrap.setAttribute('aria-expanded', 'false');
                document.removeEventListener('mousedown', closeOutside);
                document.removeEventListener('keydown', handleKey);
            }

            function closeOutside(e) {
                if (!wrap.contains(e.target)) close();
            }

            function select(el) {
                if (!el) return;
                options.forEach(function (o) { o.removeAttribute('aria-selected'); });
                el.setAttribute('aria-selected', 'true');
                valueEl.textContent = el.textContent;
                selected = el;
                if (native) {
                    native.value = el.getAttribute('data-value') || '';
                    native.dispatchEvent(new Event('change', { bubbles: true }));
                }
                close();
            }

            function highlight(dir) {
                var current = wrap.querySelector('.is-highlighted');
                var visible = Array.from(options).filter(function (o) { return !o.classList.contains('is-hidden'); });
                if (!visible.length) return;
                var idx = current ? visible.indexOf(current) : -1;
                idx = Math.max(0, Math.min(visible.length - 1, idx + dir));
                if (current) current.classList.remove('is-highlighted');
                visible[idx].classList.add('is-highlighted');
                visible[idx].scrollIntoView({ block: 'nearest' });
            }

            function handleKey(e) {
                if (e.key === 'Escape') { e.preventDefault(); close(); trigger.focus(); }
                if (e.key === 'ArrowDown') { e.preventDefault(); highlight(1); }
                if (e.key === 'ArrowUp') { e.preventDefault(); highlight(-1); }
                if (e.key === 'Enter') {
                    var highlighted = wrap.querySelector('.is-highlighted');
                    if (highlighted) { e.preventDefault(); select(highlighted); }
                }
            }

            trigger.addEventListener('click', function () {
                if (wrap.getAttribute('aria-expanded') === 'true') { close(); return; }
                open();
            });

            options.forEach(function (opt) {
                opt.addEventListener('click', function () { select(this); });
                opt.addEventListener('mousemove', function () {
                    wrap.querySelectorAll('.is-highlighted').forEach(function (h) { h.classList.remove('is-highlighted'); });
                    this.classList.add('is-highlighted');
                });
            });

            if (search) {
                search.addEventListener('input', function () {
                    var q = this.value.toLowerCase().trim();
                    options.forEach(function (o) {
                        o.classList.toggle('is-hidden', q && !o.textContent.toLowerCase().includes(q));
                    });
                    wrap.querySelectorAll('.is-highlighted').forEach(function (h) { h.classList.remove('is-highlighted'); });
                    var firstVisible = Array.from(options).find(function (o) { return !o.classList.contains('is-hidden'); });
                    if (firstVisible) firstVisible.classList.add('is-highlighted');
                });
                search.addEventListener('keydown', function (e) {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                        e.stopPropagation();
                    }
                });
            }
        });
    },

    _initPasswordStrength: function () {
        var input = document.getElementById('new-password');
        var fill = document.getElementById('pw-strength-fill');
        var label = document.getElementById('pw-strength-label');
        var meter = fill && fill.closest('.password-strength');
        if (!input || !fill || !label || !meter) return;

        input.addEventListener('input', function () {
            var v = this.value;
            if (!v) { meter.classList.remove('is-visible'); return; }
            meter.classList.add('is-visible');

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
        var confirmInput = document.getElementById('confirm-delete-input');
        var confirmPw = document.getElementById('confirm-delete-pw');
        var confirmBtn = document.getElementById('confirm-delete-btn');
        var closeBtns = modal && modal.querySelectorAll('[data-delete-close]');
        var exportLink = document.getElementById('modal-export-link');
        if (!modal || !deleteBtn || !confirmInput || !confirmBtn) return;

        function reset() {
            confirmInput.value = '';
            if (confirmPw) { confirmPw.value = ''; confirmPw.classList.remove('is-error'); }
            confirmBtn.disabled = true;
        }

        function show() {
            reset();
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            setTimeout(function () { confirmInput.focus(); }, 100);
        }

        function hide() {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            reset();
        }

        deleteBtn.addEventListener('click', show);

        closeBtns.forEach(function (b) { b.addEventListener('click', hide); });

        confirmInput.addEventListener('input', function () {
            confirmBtn.disabled = this.value.trim() !== 'ELIMINAR';
        });

        confirmBtn.addEventListener('click', async function () {
            if (this.disabled) return;
            if (self._authProvider !== 'google' && confirmPw && !confirmPw.value.trim()) {
                confirmPw.classList.add('is-error');
                confirmPw.focus();
                self._showToast('Ingresa tu contraseña para eliminar la cuenta', 'error');
                return;
            }
            var textSpan = this.querySelector('.btn-text');
            var origText = textSpan ? textSpan.textContent : '';
            if (textSpan) textSpan.textContent = 'Eliminando...';
            this.disabled = true;
            this.classList.add('btn-loading');

            try {
                await new Promise(function (r) { setTimeout(r, 1200); });
                self._showToast('Cuenta eliminada (simulado)', 'info');
                hide();
            } catch (err) {
                self._showToast(err.message || 'Error al eliminar', 'error');
            } finally {
                if (textSpan) textSpan.textContent = origText;
                this.disabled = false;
                this.classList.remove('btn-loading');
                reset();
            }
        });

        if (exportLink) {
            exportLink.addEventListener('click', function (e) {
                e.preventDefault();
                hide();
                var exportBtn = document.getElementById('btn-export');
                if (exportBtn) exportBtn.click();
            });
        }
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