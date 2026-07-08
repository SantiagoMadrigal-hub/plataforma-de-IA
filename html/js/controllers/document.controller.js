function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// El título mostrado (<h3>) se deriva de la primera línea del contenido
// (ver ai.service.js -> save()), así que casi siempre esa primera línea
// queda duplicada dentro del cuerpo. La quitamos antes de renderizar.
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

    if (
      firstLineClean === titleClean ||
      firstLineClean.startsWith(titleClean)
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
        .generated-content { line-height: 1.7; }
        .generated-content h2 { font-size: 1.4em; margin: 24px 0 12px; font-weight: 700; }
        .generated-content h3 { font-size: 1.2em; margin: 20px 0 10px; font-weight: 600; }
        .generated-content h4 { font-size: 1.05em; margin: 16px 0 8px; font-weight: 600; }
        .generated-content p { margin: 0 0 14px; }
        .generated-content ul, .generated-content ol { margin: 0 0 14px; padding-left: 22px; }
        .generated-content li { margin-bottom: 6px; }
        .generated-content strong { font-weight: 700; }
        .generated-content em { font-style: italic; }
        .generated-content code {
            background: rgba(255,255,255,0.08);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .generated-content hr {
            border: none;
            border-top: 1px solid rgba(255,255,255,0.12);
            margin: 20px 0;
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

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const prompt = document.getElementById("idea").value;
      const tone = document.getElementById("tono").value;
      const format = document.getElementById("formato").value;
      const btn = form.querySelector('button[type="submit"]');
      const outputBox = document.querySelector(".output-box");

      btn.disabled = true;
      btn.textContent = "Generando...";
      if (outputBox) outputBox.classList.add("is-loading");

      try {
        const content = await window.ContentFlowApp.services.ai.generate(
          prompt,
          tone,
          format,
        );
        const saved = await window.ContentFlowApp.services.ai.save(
          prompt,
          content,
          format,
        );

        if (outputBox) {
          outputBox.classList.remove("is-loading");
          const bodyContent = stripDuplicateTitle(saved.content, saved.title);
          outputBox.innerHTML = `
                        <h3>${escapeHtml(saved.title)}</h3>
                        <div class="generated-content">${renderMarkdown(bodyContent)}</div>
                    `;
        }
      } catch (err) {
        if (outputBox) {
          outputBox.classList.remove("is-loading");
          outputBox.innerHTML = `
                        <p class="error-message">Error al generar el contenido: ${escapeHtml(err.message)}. Por favor, inténtalo de nuevo.</p>
                    `;
        }
      } finally {
        btn.disabled = false;
        btn.textContent = "Generar contenido";
      }
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
            .catch(() => alert("No se pudo copiar"));
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
