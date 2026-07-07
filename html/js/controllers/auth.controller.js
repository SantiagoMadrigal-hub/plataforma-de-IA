// /js/controllers/auth.controller.js

export const AuthController = {
  _typingTimer: null,

  init: async function () {
    const protectedRoutes = [
      "dashboard.html",
      "generador.html",
      "history.html",
      "profile.html",
      "settings.html",
    ];
    const currentPath = window.location.pathname.split("/").pop();

    if (protectedRoutes.includes(currentPath)) {
      const user = await window.ContentFlowApp.services.auth.getCurrentUser();
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      this.setupUserProfile(user);
      this._populateSettingsForm(user);
      this._setupUserMenu(user);
      this.setupLogout();

      this._refreshFromAPI();
    }
  },

  _refreshFromAPI: async function () {
    try {
      const profile = await window.ContentFlowApp.services.auth.getUserProfile();
      if (!profile) return;
      this._setupUserMenu(profile);
      this._populateSettingsForm(profile);
      this._updateCreditsBadge(profile);
    } catch (err) {
      console.warn('No se pudo refrescar perfil:', err);
    }
  },

  _updateCreditsBadge: function (profile) {
    var badge = document.getElementById('credits-badge');
    if (!badge) return;
    var credits = profile.stats?.credits ?? '—';
    badge.textContent = 'Créditos: ' + credits;
  },

  setupUserProfile: function (user) {
    const rawName = (user.name || "").trim();
    const emailName = user.email ? user.email.split("@")[0] : "";

    const baseName =
      rawName && rawName !== "Usuario" && rawName !== "Usuario Nuevo"
        ? rawName
        : emailName;

    const displayName =
      baseName
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ") || "Usuario";

    // Typewriter
    this.typewriterEffect(displayName);

    // Avatar
    this._setupAvatar(user, displayName);
  },

  _setupAvatar: function (user, displayName) {
    const pic = document.querySelector(".profile-pic");
    if (!pic) return;

    const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const applyFallback = () => {
      pic.style.display = "none";
      pic.parentElement.classList.add("profile-fallback");
      pic.parentElement.setAttribute("data-initials", initials);
    };

    if (user.avatar_url) {
      // Estilos para foto de perfil real (Google)
      pic.style.display = "block";
      pic.style.width = "40px";
      pic.style.height = "40px";
      pic.style.borderRadius = "50%";
      pic.style.objectFit = "cover";
      pic.style.border = "2px solid var(--color-primary, #818cf8)";
      pic.style.boxShadow = "0 0 0 3px rgba(129,140,248,0.2)";
      pic.style.transition = "box-shadow 0.2s ease";
      pic.src = user.avatar_url;
      pic.alt = displayName;

      pic.addEventListener("mouseenter", () => {
        pic.style.boxShadow = "0 0 0 4px rgba(129,140,248,0.45)";
      });
      pic.addEventListener("mouseleave", () => {
        pic.style.boxShadow = "0 0 0 3px rgba(129,140,248,0.2)";
      });

      pic.onerror = applyFallback;
    } else {
      applyFallback();
    }

    // Badge de proveedor (Google vs local)
    if (user.provider === "google") {
      const wrapper = pic.parentElement;
      if (!wrapper.querySelector(".provider-badge")) {
        const badge = document.createElement("span");
        badge.className = "provider-badge";
        badge.title = "Cuenta de Google";
        badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>`;
        Object.assign(badge.style, {
          position: "absolute",
          bottom: "-2px",
          right: "-2px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        });
        wrapper.style.position = "relative";
        wrapper.appendChild(badge);
      }
    }
  },

  typewriterEffect: function (name) {
    if (this._typingTimer) {
      clearInterval(this._typingTimer);
      this._typingTimer = null;
    }

    const el = document.querySelector(".welcome-section h2");
    if (!el) return;

    el.textContent = "";
    el.classList.add("typewriter");

    const fullText = `Hola, ${name}`;
    let i = 0;
    const self = this;

    this._typingTimer = setInterval(function () {
      if (!document.contains(el)) {
        clearInterval(self._typingTimer);
        self._typingTimer = null;
        return;
      }
      if (i >= fullText.length) {
        clearInterval(self._typingTimer);
        self._typingTimer = null;
        return;
      }
      el.textContent = fullText.slice(0, i + 1);
      i++;
    }, 45);
  },

  _setupUserMenu: function (user) {
    const nameEl = document.querySelector(".dropdown-user-name");
    const emailEl = document.querySelector(".dropdown-user-email");
    const avatarEl = document.querySelector(".avatar-fallback");

    const displayName = this._getDisplayName(user);

    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = user.email || "";

    if (avatarEl) {
      const initials = this._getInitials(displayName);
      avatarEl.textContent = initials;
    }
  },

  _getDisplayName: function (user) {
    const rawName = (user.name || "").trim();
    const emailName = user.email ? user.email.split("@")[0] : "";
    const baseName =
      rawName && rawName !== "Usuario" && rawName !== "Usuario Nuevo"
        ? rawName
        : emailName;
    return (
      baseName
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ") || "Usuario"
    );
  },

  _getInitials: function (displayName) {
    return displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  },

  _populateSettingsForm: function (user) {
    const nameInput = document.getElementById("nombre");
    const emailInput = document.getElementById("correo");

    if (nameInput) {
      nameInput.value = user.name || "";
      nameInput.placeholder = "Tu nombre";
    }
    if (emailInput) {
      emailInput.value = user.email || "";
      emailInput.placeholder = "Tu correo electrónico";
    }
  },

  setupLogout: function () {
    const handleLogout = async (e) => {
      e.preventDefault();
      if (typeof google !== "undefined" && google.accounts) {
        google.accounts.id.disableAutoSelect();
      }
      await window.ContentFlowApp.services.auth.logout();
      window.location.href = "login.html";
    };

    document.querySelectorAll(".logout-btn, .dropdown-item--danger").forEach((el) => {
      el.addEventListener("click", handleLogout);
    });
  },
};
