import React, { useState, useRef } from 'react';
import { theme, card, label, value, progressBarTrack, progressBarFill } from './styles';

const initialsStyle = {
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  backgroundColor: theme.accent,
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  fontWeight: '700',
  flexShrink: 0,
  cursor: 'pointer',
  position: 'relative',
  overflow: 'hidden',
};

const avatarImgStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: '50%',
};

const uploadOverlay = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0,
  transition: 'opacity 0.2s ease',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: '600',
};

const ProfileHeader = ({ userData, onAvatarChange }) => {
  const [hover, setHover] = useState(false);
  const [hoverUpload, setHoverUpload] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => onAvatarChange?.(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ ...card, flexDirection: 'row', alignItems: 'center', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
      <div
        style={initialsStyle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => fileRef.current?.click()}
      >
        {userData.avatar ? (
          <img src={userData.avatar} alt="" style={avatarImgStyle} />
        ) : (
          userData.initials
        )}
        <div style={{ ...uploadOverlay, opacity: hover ? 1 : 0 }}>
          Subir
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', color: theme.text, marginBottom: '4px' }}>
          {userData.name}
        </div>
        <div style={{ fontSize: '14px', color: theme.muted, marginBottom: '12px' }}>
          {userData.email} &middot; Miembro desde {userData.memberSince}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: theme.muted }}>Completitud del perfil</span>
            <span style={{ fontSize: '12px', color: theme.muted }}>{userData.completionPercentage}%</span>
          </div>
          <div style={progressBarTrack}>
            <div style={progressBarFill(userData.completionPercentage)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
