// /js/controllers/form.controller.js

const GOOGLE_CLIENT_ID = '294255479548-mms7ki96l0igjer29fgl1395i74aeso4.apps.googleusercontent.com';

export const FormController = {
    init: function () {
        this._initForms();
        this._initGoogleButtons();
    },

    _initForms: function () {
        const forms = document.querySelectorAll('.form');

        forms.forEach(function (form) {
            if (form.id !== 'login-form' && form.id !== 'register-form') return;

            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                let valid = true;

                form.querySelectorAll('.form-input').forEach(i => i.classList.remove('is-error', 'is-success'));

                form.querySelectorAll('.form-input[required]').forEach(function (input) {
                    if (!input.value.trim()) { input.classList.add('is-error'); valid = false; }
                });

                form.querySelectorAll('input[type="email"]').forEach(function (input) {
                    if (input.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
                        input.classList.add('is-error'); valid = false;
                    }
                });

                if (!valid) {
                    const firstError = form.querySelector('.is-error');
                    if (firstError) firstError.focus();
                    return;
                }

                form.querySelectorAll('.form-input').forEach(i => i.classList.add('is-success'));

                const emailInput    = form.querySelector('input[type="email"]');
                const passwordInput = form.querySelector('input[type="password"]');
                const nameInput     = form.querySelector('input[id="nombre"]');

                try {
                    if (form.id === 'login-form') {
                        await window.ContentFlowApp.services.auth.login(emailInput.value, passwordInput.value);
                    } else if (form.id === 'register-form') {
                        const userName = nameInput ? nameInput.value.trim() : 'Usuario';
                        await window.ContentFlowApp.services.auth.register(userName, emailInput.value, passwordInput.value);
                    }
                    setTimeout(() => window.location.href = 'dashboard.html', 800);
                } catch (err) {
                    form.querySelectorAll('.form-input.is-success').forEach(i => i.classList.remove('is-success'));
                    let errorContainer = form.querySelector('.form-error');
                    if (!errorContainer) {
                        errorContainer = document.createElement('p');
                        errorContainer.className = 'form-error';
                        form.querySelector('.signup-header').after(errorContainer);
                    }
                    errorContainer.textContent = err.message;
                }
            });

            form.querySelectorAll('.form-input').forEach(function (input) {
                input.addEventListener('input', function () { this.classList.remove('is-error'); });
                input.addEventListener('blur', function () {
                    if (this.value.trim() && this.hasAttribute('required')) this.classList.add('is-success');
                });
            });
        });
    },

    _initGoogleButtons: function () {
        // Esperar a que el SDK de Google esté listo
        if (typeof google === 'undefined' || !google.accounts) {
            window.addEventListener('google-sdk-ready', () => this._initGoogleButtons());
            return;
        }

        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response) => {
                try {
                    // Decodificar el JWT que Google devuelve
                    const payload = JSON.parse(atob(response.credential.split('.')[1]));
                    const googleUser = {
                        id:         payload.sub,
                        name:       payload.name,
                        email:      payload.email,
                        avatar_url: payload.picture
                    };
                    await window.ContentFlowApp.services.auth.loginWithGoogle(googleUser);
                    window.location.href = 'dashboard.html';
                } catch (err) {
                    console.error('Error Google Sign-In:', err);
                    const errEl = document.querySelector('.form-error-google');
                    if (errEl) errEl.textContent = 'No se pudo iniciar sesión con Google.';
                }
            }
        });

        // Renderizar botones en login y signup
        const targets = document.querySelectorAll('.google-signin-btn');
        targets.forEach(target => {
            google.accounts.id.renderButton(target, {
                type:  'standard',
                theme: 'filled_black',
                size:  'large',
                text:  target.dataset.text || 'signin_with',
                shape: 'rectangular',
                width: target.offsetWidth || 320,
                logo_alignment: 'left'
            });
        });
    }
};
