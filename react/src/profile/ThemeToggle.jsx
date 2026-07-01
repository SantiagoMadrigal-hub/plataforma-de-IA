import React, { useState, useEffect } from 'react';
import { theme, card, cardTitle } from './styles';

const toggleRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 0',
};

const trackStyle = (active) => ({
  width: '44px',
  height: '24px',
  borderRadius: '12px',
  backgroundColor: active ? theme.accent : theme.border,
  cursor: 'pointer',
  position: 'relative',
  transition: 'background-color 0.2s ease',
  flexShrink: 0,
});

const thumbStyle = (active) => ({
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: '#ffffff',
  position: 'absolute',
  top: '2px',
  left: active ? '22px' : '2px',
  transition: 'left 0.2s ease',
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '11px',
});

const ThemeToggle = () => {
  const [dark, setDark] = useState(() => document.body.classList.contains('dark-theme'));

  useEffect(() => {
    if (dark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    try { localStorage.setItem('lexora-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  return (
    <div style={card}>
      <h2 style={cardTitle}>Apariencia</h2>
      <div style={toggleRow}>
        <div>
          <div style={{ fontSize: '14px', color: theme.text, fontWeight: '500', marginBottom: '2px' }}>
            Modo Oscuro
          </div>
          <div style={{ fontSize: '12px', color: theme.muted }}>
            Alterna entre tema oscuro y claro
          </div>
        </div>
        <div
          style={trackStyle(dark)}
          onClick={() => setDark(!dark)}
          onMouseOver={(e) => { if (!dark) e.target.style.backgroundColor = '#3a3a4e' }}
          onMouseOut={(e) => { if (!dark) e.target.style.backgroundColor = theme.border }}
        >
          <div style={thumbStyle(dark)}>
            {dark ? '🌙' : '☀️'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeToggle;
