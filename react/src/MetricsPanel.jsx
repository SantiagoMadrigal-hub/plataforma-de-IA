import React, { useState, useEffect } from 'react';

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

export const MetricsPanel = () => {
  const [docs, setDocs] = useState([]);
  const [credits, setCredits] = useState(0);
  const [maxCredits, setMaxCredits] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const app = window.ContentFlowApp;
        const allDocs = await app.services.documents.getAll();
        if (mounted) setDocs(allDocs);

        const profile = await app.services.auth.getUserProfile();
        if (mounted && profile?.stats) {
          setCredits(profile.stats.credits);
          setMaxCredits(profile.stats.creditsLimit);
        }
      } catch {
        if (mounted) setDocs([]);
      }
    }
    if (window.ContentFlowApp) {
      load();
    } else {
      document.addEventListener('ContentFlowReady', load, { once: true });
    }
    return () => { mounted = false; };
  }, []);

  const percentage = Math.min(100, Math.max(0, (credits / maxCredits) * 100));
  const barColor = percentage <= 20 ? '#ef4444' : percentage <= 50 ? '#f59e0b' : '#22c55e';
  const docsGenerated = docs.length;
  const thisWeek = docs.filter(d => {
    const weekAgo = Date.now() - 7 * 86400000;
    return new Date(d.createdAt).getTime() > weekAgo;
  }).length;

  return (
    <div style={{
      display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap'
    }}>
      <div style={{
        flex: '1 1 300px', background: '#151521', padding: '24px', borderRadius: '12px',
        border: '1px solid #2a2a3c', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#a1a1aa', fontSize: '14px', fontWeight: '500' }}>
          Créditos Restantes
        </h4>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', marginBottom: '15px' }}>
          {credits}/{maxCredits}
        </div>
        <div style={{ background: '#2a2a3c', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            background: barColor,
            height: '100%', width: `${percentage}%`, borderRadius: '4px',
            transition: 'width 1s ease-in-out, background-color 0.3s ease'
          }}></div>
        </div>
      </div>

      <div style={{
        flex: '1 1 300px', background: '#151521', padding: '24px', borderRadius: '12px',
        border: '1px solid #2a2a3c', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#a1a1aa', fontSize: '14px', fontWeight: '500' }}>
          Documentos Generados
        </h4>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff' }}>
          {docsGenerated}
        </div>
        {thisWeek > 0 && (
          <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#10b981' }}>
            ↑ +{thisWeek} esta semana
          </p>
        )}
        {docsGenerated > 0 && (
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#a1a1aa' }}>
            Último: {timeAgo(docs[0]?.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
};