import { ChatService } from '../services/chat.service.js';

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const ChatController = {
  init: async function () {
    const currentPath = window.location.pathname.split("/").pop();
    if (currentPath !== "generador.html") return;

    this.chatService = new ChatService();
    this.history = [];
    this.context = {};

    const outputBox = document.querySelector(".output-box");
    const form = document.getElementById("generator-form");

    if (!outputBox || !form) return;

    this.outputBox = outputBox;
    this.form = form;
    this.panel = document.getElementById("chat-panel");

    this.form.addEventListener("submit", () => {
      setTimeout(() => {
        const content = this.outputBox.querySelector(".generated-content");
        if (content) {
          this.captureContext();
          this.show();
        }
      }, 100);
    });
  },

  captureContext: function () {
    const tone = document.getElementById("tono");
    const format = document.getElementById("formato");
    const idea = document.getElementById("idea");
    this.context = {
      tone: tone?.value || "",
      format: format?.value || "",
      originalPrompt: idea?.value || "",
    };
  },

  getCurrentContent: function () {
    const title = this.outputBox.querySelector("h3")?.textContent || "";
    const raw = this.outputBox.dataset.rawContent || "";
    return { title, body: raw };
  },

  show: function () {
    if (!this.panel) return;
    this.panel.style.display = "";
    this.renderHistory();
    this.focusInput();
    this.attachEvents();
  },

  attachEvents: function () {
    if (this._eventsAttached) return;
    this._eventsAttached = true;

    const input = this.panel?.querySelector(".chat-input");
    const btn = this.panel?.querySelector(".chat-send-btn");

    btn?.addEventListener("click", () => this.handleSubmit());

    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSubmit();
      }
    });
  },

  hide: function () {
    if (!this.panel) return;
    this.panel.style.display = "none";
  },

  renderHistory: function () {
    const list = this.panel?.querySelector(".chat-history-list");
    if (!list) return;

    list.innerHTML = this.history
      .map(
        (item, i) => `
          <li class="chat-history-item" data-index="${i}">
            <div class="chat-history-bubble">
              <span class="chat-history-instruction">${escapeHtml(item.instruction)}</span>
            </div>
          </li>
        `,
      )
      .join("");

    list.scrollTop = list.scrollHeight;
  },

  focusInput: function () {
    const input = this.panel?.querySelector(".chat-input");
    if (input) setTimeout(() => input.focus(), 100);
  },

  handleSubmit: async function () {
    const input = this.panel?.querySelector(".chat-input");
    if (!input) return;

    const instruction = input.value.trim();
    if (!instruction) return;

    const { title, body } = this.getCurrentContent();
    const fullContent = title ? `${title}\n\n${body}` : body;

    input.value = "";
    this.setLoading(true);

    try {
      const refined = await this.chatService.refine(fullContent, instruction, this.context);

      this.history.push({ instruction });

      this.updateOutputContent(refined);
      this.renderHistory();
      this.setLoading(false);
      this.focusInput();
    } catch (err) {
      this.setLoading(false);
      this.showError(err.message);
    }
  },

  updateOutputContent: function (markdown) {
    const lines = markdown.split("\n");
    const firstLine = lines.find((l) => l.trim().length > 0) || "";
    const title = firstLine.replace(/^#+\s*/, "").trim();

    const bodyContent = stripDuplicateTitle(markdown, title);
    this.outputBox.dataset.rawContent = bodyContent;
    this.outputBox.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <div class="generated-content">${renderMarkdown(bodyContent)}</div>
    `;
  },

  setLoading: function (loading) {
    const input = this.panel?.querySelector(".chat-input");
    const btn = this.panel?.querySelector(".chat-send-btn");
    if (input) input.disabled = loading;
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading ? "Refinando..." : "Enviar";
      btn.classList.toggle("is-loading", loading);
    }
  },

  showError: function (message) {
    const errorEl = this.panel?.querySelector(".chat-error");
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.style.display = "";
    setTimeout(() => {
      errorEl.style.display = "none";
    }, 5000);
  },
};

function stripDuplicateTitle(content, title) {
  const titleClean = title.replace(/…$/, "").trim();
  const lines = content.split("\n");
  while (true) {
    const firstIdx = lines.findIndex((l) => l.trim().length > 0);
    if (firstIdx === -1) break;
    const firstLineClean = lines[firstIdx]
      .replace(/^[#*\s]+/, "")
      .replace(/[*\s]+$/, "")
      .trim();
    if (firstLineClean === titleClean || firstLineClean.startsWith(titleClean)) {
      lines.splice(firstIdx, 1);
    } else {
      break;
    }
  }
  return lines.join("\n");
}

function renderMarkdown(text) {
  const escaped = escapeHtml(text);
  const lines = escaped.split("\n");
  let html = "";
  let listType = null;

  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };

  const inline = (str) =>
    str
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;
    if (/^-{3,}$/.test(line)) {
      closeList();
      html += "<hr>";
      continue;
    }
    let m;
    if ((m = line.match(/^###\s+(.+)$/))) {
      closeList();
      html += `<h4>${inline(m[1])}</h4>`;
      continue;
    }
    if ((m = line.match(/^##\s+(.+)$/))) {
      closeList();
      html += `<h3>${inline(m[1])}</h3>`;
      continue;
    }
    if ((m = line.match(/^#\s+(.+)$/))) {
      closeList();
      html += `<h2>${inline(m[1])}</h2>`;
      continue;
    }
    if ((m = line.match(/^\d+\.\s+(.+)$/))) {
      if (listType !== "ol") {
        closeList();
        html += "<ol>";
        listType = "ol";
      }
      html += `<li>${inline(m[1])}</li>`;
      continue;
    }
    if ((m = line.match(/^[-*]\s+(.+)$/))) {
      if (listType !== "ul") {
        closeList();
        html += "<ul>";
        listType = "ul";
      }
      html += `<li>${inline(m[1])}</li>`;
      continue;
    }
    closeList();
    html += `<p>${inline(line)}</p>`;
  }
  closeList();
  return html;
}
