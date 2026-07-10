import React from 'react';
import type { SaveStatus } from '../../types/editor.types';
import styles from './SaveStatusIndicator.module.css';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Guardando...';
      case 'saved':
        return 'Guardado';
      case 'error':
        return 'Error al guardar';
      default:
        return '';
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'saving':
        return styles.saving;
      case 'saved':
        return styles.saved;
      case 'error':
        return styles.error;
      default:
        return '';
    }
  };

  if (status === 'idle') return null;

  return (
    <div
      className={`${styles.indicator} ${getStatusClass()}`}
      role="status"
      aria-live="polite"
    >
      {status === 'saving' && <span className={styles.spinner} />}
      <span>{getStatusText()}</span>
    </div>
  );
}
