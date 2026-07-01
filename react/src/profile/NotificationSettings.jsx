import React from 'react';
import { theme, card, cardTitle } from './styles';

const trackStyle = (active) => ({
  width: '40px',
  height: '22px',
  borderRadius: '11px',
  backgroundColor: active ? theme.accent : theme.border,
  cursor: 'pointer',
  position: 'relative',
  transition: 'background-color 0.2s ease',
  flexShrink: 0,
});

const thumbStyle = (active) => ({
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  backgroundColor: '#ffffff',
  position: 'absolute',
  top: '2px',
  left: active ? '20px' : '2px',
  transition: 'left 0.2s ease',
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
});

const notifConfig = [
  { key: 'emailDigest', label: 'Resumen semanal', desc: 'Recibe un resumen de tu actividad cada semana' },
  { key: 'documentShared', label: 'Documento compartido', desc: 'Notificaciones cuando alguien comparte un documento contigo' },
  { key: 'billingAlerts', label: 'Alertas de facturación', desc: 'Cambios en tu plan, pagos y renovaciones' },
  { key: 'productUpdates', label: 'Novedades del producto', desc: 'Nuevas funciones y mejoras de Lexora' },
  { key: 'marketingEmails', label: 'Emails promocionales', desc: 'Ofertas, tips y contenido educativo' },
];

const Toggle = ({ active, onChange }) => (
  <div
    style={trackStyle(active)}
    onClick={onChange}
    onMouseOver={(e) => { if (!active) e.target.style.backgroundColor = '#3a3a4e' }}
    onMouseOut={(e) => { if (!active) e.target.style.backgroundColor = theme.border }}
  >
    <div style={thumbStyle(active)} />
  </div>
);

const NotificationSettings = ({ notifications = {}, onChange }) => {
  return (
    <div style={card}>
      <h2 style={cardTitle}>Notificaciones</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {notifConfig.map((item) => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', color: theme.text, fontWeight: '500', marginBottom: '2px' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '12px', color: theme.muted }}>{item.desc}</div>
            </div>
            <Toggle
              active={!!notifications[item.key]}
              onChange={() => onChange?.(item.key, !notifications[item.key])}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationSettings;
