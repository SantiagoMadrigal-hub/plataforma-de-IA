import React from 'react';
import styles from './ToolbarButton.module.css';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function ToolbarButton({
  icon,
  label,
  isActive = false,
  disabled = false,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.button} ${isActive ? styles.active : ''}`}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      {icon}
    </button>
  );
}
