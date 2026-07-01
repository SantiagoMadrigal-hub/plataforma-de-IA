import React from 'react';
import { theme, card, cardTitle, fieldGroup, label, value, progressBarTrack, progressBarFill, btnSecondary } from './styles';

const badge = {
  backgroundColor: 'rgba(99, 102, 241, 0.15)',
  color: theme.accent,
  padding: '2px 10px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '600',
  marginLeft: '8px',
};

const statRow = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '6px',
  fontSize: '13px',
};

const statLabel = { color: theme.muted };
const statValue = { color: theme.text, fontWeight: '600' };

const barSection = {
  marginBottom: '16px',
};

const UsageBar = ({ label: lbl, current, limit, color }) => (
  <div style={barSection}>
    <div style={statRow}>
      <span style={statLabel}>{lbl}</span>
      <span style={statValue}>{current.toLocaleString()} / {limit.toLocaleString()}</span>
    </div>
    <div style={progressBarTrack}>
      <div style={{ ...progressBarFill((current / limit) * 100), backgroundColor: color || theme.accent }} />
    </div>
  </div>
);

const SubscriptionPanel = ({ userData }) => {
  const { plan, credits, creditsLimit, renewalDate, usageStats } = userData;

  return (
    <div style={card}>
      <h2 style={cardTitle}>Suscripción</h2>

      <div style={fieldGroup}>
        <span style={label}>Plan Actual</span>
        <div style={value}>
          {plan}
          <span style={badge}>Activo</span>
        </div>
      </div>

      <div style={fieldGroup}>
        <span style={label}>Créditos Disponibles</span>
        <div>
          <span style={{ ...value, display: 'inline', marginRight: '6px' }}>{credits.toLocaleString()}</span>
          <span style={{ fontSize: '13px', color: theme.muted }}>créditos</span>
        </div>
        <div style={{ marginTop: '8px' }}>
          <UsageBar label="Créditos" current={credits} limit={creditsLimit} color={theme.accent} />
        </div>
      </div>

      {usageStats && (
        <div style={fieldGroup}>
          <span style={label}>Uso del Mes</span>
          <UsageBar label="Documentos" current={usageStats.documentsThisMonth} limit={100} color={theme.success} />
          <UsageBar label="Tokens IA" current={usageStats.aiTokensUsed} limit={usageStats.aiTokensLimit} color={theme.warning} />
          <UsageBar label="Almacenamiento" current={usageStats.storageUsed} limit={usageStats.storageLimit} color="#a78bfa" />
        </div>
      )}

      <div style={fieldGroup}>
        <span style={label}>Próxima Renovación</span>
        <span style={value}>{renewalDate}</span>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        <button
          style={btnSecondary}
          onMouseOver={(e) => { e.target.style.backgroundColor = theme.border }}
          onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent' }}
          onClick={() => console.log('Gestionar suscripción')}
        >
          Gestionar Suscripción
        </button>
      </div>
    </div>
  );
};

export default SubscriptionPanel;
