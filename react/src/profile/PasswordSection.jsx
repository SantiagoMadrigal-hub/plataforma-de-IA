import React, { useState } from 'react';
import { theme, card, cardTitle, fieldGroup, label, input, btnPrimary, btnSecondary } from './styles';

const PasswordSection = () => {
  const [open, setOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    setError('');
    setSuccess(false);
    if (!currentPw) { setError('Ingresa tu contraseña actual'); return; }
    if (newPw.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    if (newPw !== confirmPw) { setError('Las contraseñas no coinciden'); return; }
    setTimeout(() => {
      setSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setSuccess(false), 3000);
    }, 600);
  };

  return (
    <div style={card}>
      <h2 style={cardTitle}>Contraseña</h2>

      <button
        onClick={() => setOpen(!open)}
        style={{
          ...btnSecondary,
          width: 'fit-content',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        onMouseOver={(e) => { e.target.style.backgroundColor = theme.border }}
        onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent' }}
      >
        <span style={{ display: 'inline-block', transition: 'transform 0.2s ease', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ▶
        </span>
        Cambiar Contraseña
      </button>

      {open && (
        <div style={{ marginTop: '20px' }}>
          <div style={fieldGroup}>
            <label style={label}>Contraseña Actual</label>
            <input
              style={input}
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = theme.accent }}
              onBlur={(e) => { e.target.style.borderColor = theme.border }}
            />
          </div>
          <div style={fieldGroup}>
            <label style={label}>Nueva Contraseña</label>
            <input
              style={input}
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = theme.accent }}
              onBlur={(e) => { e.target.style.borderColor = theme.border }}
            />
          </div>
          <div style={fieldGroup}>
            <label style={label}>Confirmar Nueva Contraseña</label>
            <input
              style={input}
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = theme.accent }}
              onBlur={(e) => { e.target.style.borderColor = theme.border }}
            />
          </div>

          {error && (
            <div style={{ color: theme.error, fontSize: '13px', marginBottom: '12px' }}>{error}</div>
          )}
          {success && (
            <div style={{ color: theme.success, fontSize: '13px', marginBottom: '12px' }}>Contraseña actualizada correctamente.</div>
          )}

          <button
            style={btnPrimary}
            onMouseOver={(e) => { e.target.style.opacity = '0.85' }}
            onMouseOut={(e) => { e.target.style.opacity = '1' }}
            onClick={handleSubmit}
          >
            Actualizar Contraseña
          </button>
        </div>
      )}
    </div>
  );
};

export default PasswordSection;
