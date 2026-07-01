function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const DocumentController = {
    init: async function () {
        const currentPath = window.location.pathname.split('/').pop();

        if (currentPath === 'generador.html') {
            this.setupGenerator();
        } else if (currentPath === 'history.html') {
            await this.renderHistoryDocs();
        }
    },

    setupGenerator: function () {
        const form = document.getElementById('generator-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const prompt = document.getElementById('idea').value;
            const tone = document.getElementById('tono').value;
            const format = document.getElementById('formato').value;
            const btn = form.querySelector('button[type="submit"]');
            const outputBox = document.querySelector('.output-box');

            btn.disabled = true;
            btn.textContent = 'Generando...';

            try {
                const content = await window.ContentFlowApp.services.ai.generate(prompt, tone, format);
                const saved = await window.ContentFlowApp.services.ai.save(prompt, content, format);

                if (outputBox) {
                    outputBox.innerHTML = `
                        <h3>${escapeHtml(saved.title)}</h3>
                        <p>${escapeHtml(saved.content)}</p>
                    `;
                }
            } catch (err) {
                if (outputBox) {
                    outputBox.innerHTML = `
                        <p class="error-message">Error al generar el contenido: ${escapeHtml(err.message)}. Por favor, inténtalo de nuevo.</p>
                    `;
                }
            } finally {
                btn.disabled = false;
                btn.textContent = 'Generar contenido';
            }
        });

        this.setupActionButtons();
    },

    setupActionButtons: function () {
        const outputBox = document.querySelector('.output-box');
        const btns = document.querySelector('.action-buttons');
        if (!btns || !outputBox) return;

        btns.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const title = outputBox.querySelector('h3')?.textContent || '';
                const content = outputBox.querySelector('p')?.textContent || '';

                if (action === 'copy') {
                    navigator.clipboard.writeText(`${title}\n\n${content}`).catch(() => alert('No se pudo copiar'));
                } else if (action === 'pdf') {
                    this.downloadAsPDF(title, content);
                } else if (action === 'word') {
                    this.downloadAsWord(title, content);
                } else if (action === 'regenerate') {
                    document.getElementById('generator-form')?.requestSubmit();
                }
            });
        });
    },

    downloadAsPDF: function (title, content) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 72;
        const maxWidth = pageWidth - margin * 2;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(title, margin, 80, { maxWidth });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);

        const lines = doc.splitTextToSize(content, maxWidth);
        doc.text(lines, margin, 120, { lineHeightFactor: 1.5 });

        doc.save(`${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    },

    downloadAsWord: function (title, content) {
        const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
xmlns:w='urn:schemas-microsoft-com:office:word'
xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body><h1>${escapeHtml(title)}</h1><pre style="font-family:Calibri;font-size:12pt">${escapeHtml(content)}</pre></body></html>`;
        const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.doc`;
        a.click();
        URL.revokeObjectURL(url);
    },

    renderHistoryDocs: async function () {
        const tbody = document.querySelector('.history-table tbody');
        if (!tbody) return;

        const docs = await window.ContentFlowApp.services.documents.getAll();

        if (docs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No hay documentos aún.</td></tr>';
            return;
        }

        const docsById = new Map(docs.map(d => [d.id, d]));

        tbody.innerHTML = docs.map(doc => `
            <tr>
                <td>${escapeHtml(doc.title)}</td>
                <td>${new Date(doc.createdAt).toLocaleDateString('es-ES')}</td>
                <td class="table-actions">
                    <a href="generador.html?id=${encodeURIComponent(doc.id)}">Editar</a>
                    <span class="action-sep"></span>
                    <a href="#" data-delete-id="${doc.id}">Borrar</a>
                    <span class="action-sep"></span>
                    <a href="#" data-download-id="${doc.id}">Descargar</a>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-delete-id]').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm('¿Eliminar este documento?')) {
                    await window.ContentFlowApp.services.documents.delete(link.dataset.deleteId);
                    await this.renderHistoryDocs();
                }
            });
        });

        tbody.querySelectorAll('[data-download-id]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const doc = docsById.get(link.dataset.downloadId);
                this.downloadAsPDF(doc?.title || 'documento', doc?.content || '');
            });
        });
    },

    timeAgo: function (dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'hace unos segundos';
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} horas`;
        if (diff < 2592000) return `hace ${Math.floor(diff / 86400)} días`;
        return date.toLocaleDateString('es-ES');
    }
};