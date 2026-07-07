import React, { useState, useEffect, useMemo } from 'react';

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
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

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
    <div style={{ background: '#151521', padding: '24px', borderRadius: '12px', border: '1px solid #2a2a3c' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#ffffff', fontSize: '18px' }}>Tus Documentos</h3>
        <input
          type="text"
          placeholder="Buscar documentos..."
          aria-label="Buscar documentos"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: '6px', border: '1px solid #2a2a3c',
            background: '#1e1e2d', color: '#ffffff', outline: 'none'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {status === 'loading' && <p style={{ color: '#a1a1aa' }}>Cargando documentos…</p>}

        {status === 'error' && (
          <p style={{ color: '#f87171' }}>No se pudieron cargar tus documentos. Intenta recargar la página.</p>
        )}

        {status === 'ready' && filteredDocs.map(doc => (
          <div key={doc.id} style={{ padding: '15px', borderRadius: '8px', background: '#1e1e2d' }}>
            <div style={{ fontWeight: '500', color: '#ffffff', marginBottom: '5px' }}>{doc.title}</div>
            <div style={{ fontSize: '12px', color: '#818cf8' }}>{timeAgo(doc.createdAt)} • {doc.type}</div>
          </div>
        ))}

        {status === 'ready' && filteredDocs.length === 0 && (
          allDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
                <path d="M9 4h2" opacity="0.5" />
              </svg>
              <p style={{ color: '#a1a1aa', margin: '0 0 20px', fontSize: '14px' }}>Aún no has generado documentos.</p>
              <a href="generador.html" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 22px', borderRadius: '8px',
                background: 'transparent', border: '1px solid #4f46e5', color: '#818cf8',
                textDecoration: 'none', fontSize: '14px', fontWeight: '500',
                transition: 'all 0.2s'
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#4f46e5'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#818cf8' }}>
                Genera tu primer documento →
              </a>
            </div>
          ) : (
            <p style={{ color: '#a1a1aa' }}>No se encontraron resultados.</p>
          )
        )}
      </div>
    </div>
  );
};