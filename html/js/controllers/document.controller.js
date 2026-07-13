function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(message, type) {
  type = type || "info";
  var container = document.getElementById("toast-container");
  if (!container) return;

  var toast = document.createElement("div");
  toast.className = "toast toast--" + type;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(function () {
    toast.classList.add("toast-leaving");
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  }, 3000);
}

function restoreFormState() {
  try {
    var saved = localStorage.getItem("contentflow_generator_form");
    if (!saved) return;
    var data = JSON.parse(saved);
    var idea = document.getElementById("idea");
    var tono = document.getElementById("tono");
    var formato = document.getElementById("formato");
    if (idea && data.idea) idea.value = data.idea;
    if (tono && data.tono) tono.value = data.tono;
    if (formato && data.formato) formato.value = data.formato;
  } catch (_) {}
}

function saveFormState() {
  try {
    var idea = document.getElementById("idea");
    var tono = document.getElementById("tono");
    var formato = document.getElementById("formato");
    localStorage.setItem(
      "contentflow_generator_form",
      JSON.stringify({
        idea: idea ? idea.value : "",
        tono: tono ? tono.value : "",
        formato: formato ? formato.value : "",
      })
    );
  } catch (_) {}
}

function updateCharCounter() {
  var textarea = document.getElementById("idea");
  var counter = document.getElementById("char-counter");
  if (!textarea || !counter) return;
  var len = textarea.value.length;
  var max = parseInt(textarea.getAttribute("maxlength"), 10) || 500;
  counter.textContent = len + " / " + max;
  counter.classList.toggle("is-near-limit", len >= max * 0.8 && len < max);
  counter.classList.toggle("is-at-limit", len >= max);
}

// El título mostrado (<h3>) se deriva de la primera línea del contenido
// (ver ai.service.js -> save()), así que casi siempre esa primera línea
// queda duplicada dentro del cuerpo. La quitamos antes de renderizar.
function stripDuplicateTitle(content, title) {
  const titleClean = title.replace(/…$/, "").replace(/\*+/g, "").trim();
  const lines = content.split("\n");

  while (true) {
    const firstIdx = lines.findIndex((l) => l.trim().length > 0);
    if (firstIdx === -1) break;

    const firstLineClean = lines[firstIdx]
      .replace(/^[#*\s]+/, "")
      .replace(/[*\s]+$/, "")
      .replace(/\*+/g, "")
      .trim();
    const firstLineContent = firstLineClean.replace(/^[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]+/, "").trim();

    if (
      firstLineClean === titleClean ||
      firstLineClean.startsWith(titleClean) ||
      firstLineContent.startsWith(titleClean)
    ) {
      lines.splice(firstIdx, 1);
    } else {
      break;
    }
  }
  return lines.join("\n");
}

// Convierte el Markdown que devuelve la IA (títulos con #, **negritas**,
// listas, etc.) en HTML real. Es deliberadamente simple (sin dependencias
// externas) — cubre lo que las plantillas de ai.service.js realmente usan.
// El texto se escapa PRIMERO (previene inyección de HTML) y el markdown
// se interpreta después, sobre el texto ya escapado.
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

    // Una línea en blanco NO cierra una lista por sí sola: Groq suele
    // separar cada ítem con una línea vacía, y si cerráramos la lista
    // aquí, cada ítem quedaría como su propia lista reiniciando en 1.
    // La lista solo se cierra cuando aparece un bloque de otro tipo.
    if (line === "") {
      continue;
    }

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

// Inyecta los estilos del contenido generado una sola vez. Usa
// `inherit`/rgba blancas para adaptarse al tema oscuro existente sin
// depender de variables CSS específicas de otro archivo.
function ensureGeneratedContentStyles() {
  if (document.getElementById("generated-content-styles")) return;
  const style = document.createElement("style");
  style.id = "generated-content-styles";
  style.textContent = `
        .generated-content {
            line-height: 1.75;
            max-width: 72ch;
            font-size: 0.95rem;
        }
        .generated-content h2 {
            font-size: 1.35em;
            margin: 28px 0 14px;
            font-weight: 700;
            line-height: 1.3;
        }
        .generated-content h3 {
            font-size: 1.15em;
            margin: 24px 0 12px;
            font-weight: 600;
            line-height: 1.35;
        }
        .generated-content h4 {
            font-size: 1.05em;
            margin: 20px 0 10px;
            font-weight: 600;
            line-height: 1.4;
        }
        .generated-content p {
            margin: 0 0 18px;
        }
        .generated-content ul, .generated-content ol {
            margin: 0 0 18px;
            padding-left: 24px;
        }
        .generated-content li {
            margin-bottom: 10px;
            line-height: 1.65;
        }
        .generated-content li:last-child {
            margin-bottom: 0;
        }
        .generated-content strong {
            font-weight: 700;
            color: inherit;
        }
        .generated-content em {
            font-style: italic;
        }
        .generated-content code {
            background: rgba(0, 0, 0, 0.06);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.875em;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
        }
        .generated-content pre {
            background: rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            overflow-x: auto;
        }
        .generated-content pre code {
            background: none;
            padding: 0;
            font-size: 0.85em;
        }
        .generated-content hr {
            border: none;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
            margin: 24px 0;
        }
        .generated-content blockquote {
            border-left: 3px solid var(--color-primary, #4F46E5);
            padding: 12px 16px;
            margin: 16px 0;
            background: rgba(79, 70, 229, 0.04);
            border-radius: 0 8px 8px 0;
            font-style: italic;
            color: inherit;
        }

        /* Dark theme overrides */
        .dark-theme .generated-content code {
            background: rgba(255, 255, 255, 0.08);
        }
        .dark-theme .generated-content pre {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.08);
        }
        .dark-theme .generated-content hr {
            border-color: rgba(255, 255, 255, 0.1);
        }
        .dark-theme .generated-content strong {
            color: #f4f4f5;
        }
        .dark-theme .generated-content h2,
        .dark-theme .generated-content h3,
        .dark-theme .generated-content h4 {
            color: #f4f4f5;
        }
        .dark-theme .generated-content blockquote {
            background: rgba(79, 70, 229, 0.08);
        }

        /* Responsive: mobile */
        @media (max-width: 768px) {
            .generated-content {
                font-size: 0.9rem;
                line-height: 1.7;
            }
            .generated-content h2 {
                font-size: 1.2em;
                margin: 20px 0 10px;
            }
            .generated-content h3 {
                font-size: 1.1em;
                margin: 18px 0 8px;
            }
            .generated-content h4 {
                font-size: 1em;
                margin: 16px 0 8px;
            }
            .generated-content p {
                margin-bottom: 14px;
            }
            .generated-content ul, .generated-content ol {
                margin-bottom: 14px;
                padding-left: 20px;
            }
            .generated-content li {
                margin-bottom: 8px;
            }
            .generated-content pre {
                padding: 12px;
                margin: 12px 0;
                font-size: 0.85em;
            }
        }
    `;
  document.head.appendChild(style);
}

export const DocumentController = {
  init: async function () {
    const currentPath = window.location.pathname.split("/").pop();

    if (currentPath === "generador.html") {
      this.setupGenerator();
    } else if (currentPath === "history.html") {
      await this.renderHistoryDocs();
    }
  },

  setupGenerator: function () {
    const form = document.getElementById("generator-form");
    if (!form) return;

    ensureGeneratedContentStyles();
    restoreFormState();
    updateCharCounter();

    var textarea = document.getElementById("idea");
    if (textarea) {
      textarea.addEventListener("input", function () {
        updateCharCounter();
        saveFormState();
      });
      textarea.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          form.requestSubmit();
        }
      });
    }

    var tono = document.getElementById("tono");
    var formato = document.getElementById("formato");
    if (tono) tono.addEventListener("change", saveFormState);
    if (formato) formato.addEventListener("change", saveFormState);

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const prompt = document.getElementById("idea").value;
      const tone = document.getElementById("tono").value;
      const format = document.getElementById("formato").value;
      const btn = form.querySelector('button[type="submit"]');
      const outputBox = document.querySelector(".output-box");
      const emptyState = document.getElementById("empty-state");
      const actionBlock = document.getElementById("action-block");

      if (emptyState) emptyState.style.display = "none";
      if (actionBlock) actionBlock.style.display = "none";
      if (outputBox) {
        outputBox.style.display = "block";
        outputBox.classList.add("is-loading");
      }

      btn.disabled = true;
      btn.classList.add("btn-loading");
      btn.innerHTML = '<span class="btn-text">Generando...</span>';

      const outputContainer = document.createElement("div");
      outputContainer.className = "generated-content";
      if (outputBox) {
        outputBox.innerHTML = "";
        outputBox.appendChild(outputContainer);
      }

      let fullContent = "";

      function finalize() {
        btn.disabled = false;
        btn.classList.remove("btn-loading");
        btn.textContent = "Generar contenido";
      }

      window.ContentFlowApp.services.ai.generateStream(prompt, tone, format, {
        onChunk: (text) => {
          fullContent += text;
          if (outputContainer) {
            outputContainer.innerHTML = renderMarkdown(fullContent);
          }
        },
        onDone: async () => {
          try {
            const saved = await window.ContentFlowApp.services.ai.save(
              prompt,
              fullContent,
              format,
              tone,
            );
            if (outputBox) {
              outputBox.classList.remove("is-loading");
              outputBox.style.display = "none";
            }
            if (actionBlock) actionBlock.style.display = "block";

            const editorContainer = document.getElementById("editor-mount-container");
            const editorMount = document.getElementById("document-editor-mount");
            if (editorContainer && editorMount) {
              editorContainer.style.display = "block";
              document.querySelector(".generator-container")?.classList.add("editor-active");
              editorMount.classList.add("react-mount");
              editorMount.setAttribute("data-component", "DocumentEditor");
              editorMount.setAttribute("data-document-id", saved.id);
              editorMount.setAttribute("data-mode", "edit");
              editorMount.setAttribute("data-initial-content", saved.content);
              editorMount.setAttribute("data-tone", saved.tone || "");
              editorMount.setAttribute("data-format", saved.format || "");

              if (window.ContentFlowApp && window.ContentFlowApp.mountNewComponents) {
                setTimeout(() => {
                  window.ContentFlowApp.mountNewComponents();
                }, 100);
              }
            }
          } catch (saveErr) {
            if (outputBox) {
              outputBox.classList.remove("is-loading");
              outputBox.innerHTML = `<p class="error-message">Error al guardar: ${escapeHtml(saveErr.message)}</p>`;
            }
          }
          finalize();
        },
        onError: (err) => {
          if (outputBox) {
            outputBox.classList.remove("is-loading");
            outputBox.innerHTML = `<p class="error-message">Error al generar el contenido: ${escapeHtml(err.message)}. Por favor, intentalo de nuevo.</p>`;
          }
          if (actionBlock) actionBlock.style.display = "block";
          finalize();
        },
      });
    });

    this.setupActionButtons();
  },

  setupActionButtons: function () {
    const outputBox = document.querySelector(".output-box");
    const btns = document.querySelector(".action-buttons");
    if (!btns || !outputBox) return;

    btns.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const title = outputBox.querySelector("h3")?.textContent || "";
        const content =
          outputBox.querySelector(".generated-content")?.innerText || "";

        if (action === "copy") {
          navigator.clipboard
            .writeText(`${title}\n\n${content}`)
            .then(function () {
              showToast("Texto copiado al portapapeles", "success");
            })
            .catch(function () {
              showToast("No se pudo copiar el texto", "error");
            });
        } else if (action === "pdf") {
          this.downloadAsPDF(title, content);
        } else if (action === "word") {
          this.downloadAsWord(title, content);
        } else if (action === "regenerate") {
          document.getElementById("generator-form")?.requestSubmit();
        }
      });
    });
  },

  downloadAsPDF: function (title, content) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 72;
    const maxWidth = pageWidth - margin * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(title, margin, 80, { maxWidth });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(content, maxWidth);
    doc.text(lines, margin, 120, { lineHeightFactor: 1.5 });

    doc.save(`${title.replace(/[^a-z0-9]/gi, "_")}.pdf`);
  },

  downloadAsWord: function (title, content) {
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
xmlns:w='urn:schemas-microsoft-com:office:word'
xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body><h1>${escapeHtml(title)}</h1><pre style="font-family:Calibri;font-size:12pt">${escapeHtml(content)}</pre></body></html>`;
    const blob = new Blob(["\ufeff" + html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  },

  renderHistoryDocs: async function () {
    const tbody = document.querySelector(".history-table tbody");
    if (!tbody) return;

    const docs = await window.ContentFlowApp.services.documents.getAll();

    if (docs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No hay documentos aún.</td></tr>';
      return;
    }

    const docsById = new Map(docs.map((d) => [d.id, d]));

    tbody.innerHTML = docs
      .map(
        (doc) => `
            <tr>
                <td>${escapeHtml(doc.title)}</td>
                <td>${new Date(doc.createdAt).toLocaleDateString("es-ES")}</td>
                <td class="table-actions">
                    <a href="generador.html?id=${encodeURIComponent(doc.id)}">Editar</a>
                    <span class="action-sep"></span>
                    <a href="#" data-delete-id="${doc.id}">Borrar</a>
                    <span class="action-sep"></span>
                    <a href="#" data-download-id="${doc.id}">Descargar</a>
                </td>
            </tr>
        `,
      )
      .join("");

    tbody.querySelectorAll("[data-delete-id]").forEach((link) => {
      link.addEventListener("click", async (e) => {
        e.preventDefault();
        if (confirm("¿Eliminar este documento?")) {
          await window.ContentFlowApp.services.documents.delete(
            link.dataset.deleteId,
          );
          await this.renderHistoryDocs();
        }
      });
    });

    tbody.querySelectorAll("[data-download-id]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const doc = docsById.get(link.dataset.downloadId);
        this.downloadAsPDF(doc?.title || "documento", doc?.content || "");
      });
    });
  },

  timeAgo: function (dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "hace unos segundos";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} horas`;
    if (diff < 2592000) return `hace ${Math.floor(diff / 86400)} días`;
    return date.toLocaleDateString("es-ES");
  },
};
