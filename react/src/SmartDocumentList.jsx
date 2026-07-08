import { useState, useEffect, useMemo } from 'react';
import styles from './SmartDocumentList.module.css';

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'hace unos segundos';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} horas`;
  if (diff < 2592000) return `hace ${Math.floor(diff / 86400)} días`;
  return date.toLocaleDateString('es-ES');
}

export const SmartDocumentList = () => {
  const [allDocs, setAllDocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isMounted = true;

    async function loadDocs() {
      try {
        const docs = await window.ContentFlowApp.services.documents.getAll();
        if (isMounted) {
          setAllDocs(Array.isArray(docs) ? docs : []);
          setStatus('ready');
        }
      } catch {
        if (isMounted) {
          setAllDocs([]);
          setStatus('error');
        }
      }
    }

    if (window.ContentFlowApp) {
      loadDocs();
    } else {
      document.addEventListener('ContentFlowReady', loadDocs, { once: true });
    }

    return () => { isMounted = false; };
  }, []);

  const filteredDocs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return allDocs.filter(doc => (doc.title || '').toLowerCase().includes(term));
  }, [allDocs, searchTerm]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Tus Documentos</h3>
        {allDocs.length > 0 && (
          <input
            type="text"
            placeholder="Buscar documentos..."
            aria-label="Buscar documentos"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        )}
      </div>

      <div className={styles.list}>
        {status === 'loading' && <p className={styles.loading}>Cargando documentos…</p>}

        {status === 'error' && (
          <p className={styles.error}>No se pudieron cargar tus documentos. Intenta recargar la página.</p>
        )}

        {status === 'ready' && filteredDocs.map(doc => (
          <div key={doc.id} className={styles.docItem}>
            <div className={styles.docTitle}>{doc.title}</div>
            <div className={styles.docMeta}>{timeAgo(doc.createdAt)} • {doc.type}</div>
          </div>
        ))}

        {status === 'ready' && filteredDocs.length === 0 && (
          allDocs.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
                <path d="M9 4h2" opacity="0.5" />
              </svg>
              <p className={styles.emptyText}>Aún no has generado documentos.</p>
              <a href="generador.html" className={styles.cta}>
                Genera tu primer documento →
              </a>
            </div>
          ) : (
            <p className={styles.noResults}>No se encontraron resultados.</p>
          )
        )}
      </div>
    </div>
  );
};
