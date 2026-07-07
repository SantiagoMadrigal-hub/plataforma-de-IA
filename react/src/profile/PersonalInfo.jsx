import React, { useState } from 'react';
import { theme, card, cardTitle, fieldGroup, label, value, input, btnPrimary, btnSecondary, inlineBtn } from './styles';

const PersonalInfo = ({ userData, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(userData.name);
  const [email, setEmail] = useState(userData.email);
  const [error, setError] = useState('');

  const validate = () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email inválido'); return false; }
    return true;
  };

  const handleSave = () => {
    setError('');
    if (!name.trim()) { setError('El nombre es obligatorio'); return false; }
    onUpdate?.({ name: name.trim() });
    setEditing(false);
  };

  const handleCancel = () => {
    setName(userData.name);
    setEmail(userData.email);
    setError('');
    setEditing(false);
  };

  return (
    <div style={card}>
      <h2 style={cardTitle}>Información Personal</h2>

      {!editing ? (
        <>
          <div style={fieldGroup}>
            <span style={label}>Nombre Completo</span>
            <span style={value}>{userData.name}</span>
          </div>
          <div style={fieldGroup}>
            <span style={label}>Correo Electrónico</span>
            <span style={value}>{userData.email}</span>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              style={btnPrimary}
              onMouseOver={(e) => e.target.style.opacity = '0.85'}
              onMouseOut={(e) => e.target.style.opacity = '1'}
              onClick={() => setEditing(true)}
            >
              Editar Perfil
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={fieldGroup}>
            <label style={label}>Nombre Completo</label>
            <input
              style={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = theme.accent }}
              onBlur={(e) => { e.target.style.borderColor = theme.border }}
            />
          </div>
          <div style={fieldGroup}>
            <label style={label}>Correo Electrónico</label>
                <input
                  style={{ ...input, opacity: 0.7, cursor: 'not-allowed' }}
                  value={email}
                  readOnly
                />
          </div>
          {error && (
            <div style={{ color: theme.error, fontSize: '13px', marginBottom: '12px' }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              style={{ ...btnPrimary, width: 'auto' }}
              onMouseOver={(e) => e.target.style.opacity = '0.85'}
              onMouseOut={(e) => e.target.style.opacity = '1'}
              onClick={handleSave}
            >
              Guardar
            </button>
            <button
              style={btnSecondary}
              onMouseOver={(e) => { e.target.style.backgroundColor = theme.border }}
              onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent' }}
              onClick={handleCancel}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PersonalInfo;
