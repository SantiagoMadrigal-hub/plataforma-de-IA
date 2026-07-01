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
          <p style={{ color: '#a1a1aa' }}>
            {allDocs.length === 0 ? 'Aún no has generado documentos.' : 'No se encontraron resultados.'}
          </p>
        )}
      </div>
    </div>
  );
};