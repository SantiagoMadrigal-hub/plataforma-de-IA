import React from 'react';
import { theme, card, cardTitle } from './styles';

const iconMap = {
  document_created: {
    label: '📄',
    color: theme.accent,
  },
  ai_generation: {
    label: '🤖',
    color: theme.warning,
  },
  settings_change: {
    label: '⚙️',
    color: theme.success,
  },
  login: {
    label: '🔐',
    color: '#a78bfa',
  },
  default: {
    label: '•',
    color: theme.muted,
  },
};

const ActivityTimeline = ({ activities = [] }) => {
  if (activities.length === 0) {
    return (
      <div style={card}>
        <h2 style={cardTitle}>Actividad Reciente</h2>
        <p style={{ color: theme.muted, fontSize: '14px' }}>No hay actividad registrada.</p>
      </div>
    );
  }

  return (
    <div style={card}>
      <h2 style={cardTitle}>Actividad Reciente</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {activities.map((item, idx) => {
          const icon = iconMap[item.type] || iconMap.default;
          const isLast = idx === activities.length - 1;
          return (
            <div key={item.id} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px', flexShrink: 0 }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  backgroundColor: icon.color, marginTop: '5px', flexShrink: 0,
                }} />
                {!isLast && (
                  <div style={{
                    width: '2px', flex: 1, minHeight: '24px',
                    backgroundColor: theme.border, marginTop: '4px',
                  }} />
                )}
              </div>
              <div style={{ paddingBottom: isLast ? '0' : '20px', flex: 1 }}>
                <div style={{ fontSize: '14px', color: theme.text, fontWeight: '500', marginBottom: '2px' }}>
                  {item.description}
                </div>
                <div style={{ fontSize: '12px', color: theme.muted }}>{item.date}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityTimeline;
