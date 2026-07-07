export const theme = {
  bg: '#151521',
  cardBg: '#1e1e2d',
  border: '#2a2a3c',
  text: '#ffffff',
  muted: '#a1a1aa',
  accent: '#4F46E5',
  accentHover: '#4338CA',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  progressTrack: '#2a2a3c',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

export const card = {
  backgroundColor: theme.cardBg,
  border: `1px solid ${theme.border}`,
  borderRadius: '12px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
};

export const cardTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: theme.text,
  marginBottom: '20px',
  borderBottom: `1px solid ${theme.border}`,
  paddingBottom: '12px',
};

export const fieldGroup = {
  marginBottom: '16px',
};

export const label = {
  display: 'block',
  fontSize: '13px',
  color: theme.muted,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export const value = {
  fontSize: '15px',
  color: theme.text,
  fontWeight: '500',
};

export const input = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  fontFamily: theme.fontFamily,
  backgroundColor: theme.bg,
  border: `1px solid ${theme.border}`,
  borderRadius: '8px',
  color: theme.text,
  outline: 'none',
  boxSizing: 'border-box',
};

export const btnPrimary = {
  backgroundColor: theme.accent,
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'opacity 0.2s ease',
};

export const btnSecondary = {
  backgroundColor: 'transparent',
  color: theme.text,
  border: `1px solid ${theme.border}`,
  borderRadius: '8px',
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
};

export const inlineBtn = {
  background: 'none',
  border: 'none',
  color: theme.accent,
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '600',
  padding: '0',
  fontFamily: theme.fontFamily,
};

export const progressBarTrack = {
  width: '100%',
  height: '8px',
  backgroundColor: theme.progressTrack,
  borderRadius: '4px',
  overflow: 'hidden',
};

export const progressBarFill = (pct) => ({
  width: `${Math.min(pct, 100)}%`,
  height: '100%',
  backgroundColor: theme.accent,
  borderRadius: '4px',
  transition: 'width 0.6s ease',
});
