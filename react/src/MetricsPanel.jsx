import { useState, useEffect } from 'react';
import styles from './MetricsPanel.module.css';

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
    <div className={styles.container}>
      <div className={styles.card}>
        <h4 className={styles.label}>Créditos Restantes</h4>
        <div className={styles.value}>{credits}/{maxCredits}</div>
        <div className={styles.barBg}>
          <div className={styles.barFill}
            style={{ background: barColor, width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className={styles.card}>
        <h4 className={styles.label}>Documentos Generados</h4>
        <div className={styles.value}>{docsGenerated}</div>
        {thisWeek > 0 && (
          <p className={styles.weekBadge}>↑ +{thisWeek} esta semana</p>
        )}
        {docsGenerated > 0 && (
          <p className={styles.lastBadge}>
            Último: {timeAgo(docs[0]?.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
};
