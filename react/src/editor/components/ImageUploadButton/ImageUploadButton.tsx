import React, { useRef, useState } from 'react';
import { ToolbarButton } from '../Toolbar/ToolbarButton';
import styles from './ImageUploadButton.module.css';

interface ImageUploadButtonProps {
  onUpload: (file: File) => Promise<void>;
}

const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

export function ImageUploadButton({ onUpload }: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <ToolbarButton
        icon={<ImageIcon />}
        label={isUploading ? 'Subiendo imagen...' : 'Insertar imagen'}
        disabled={isUploading}
        onClick={handleClick}
      />
      {isUploading && (
        <div className={styles.uploading}>
          <span className={styles.spinner} />
        </div>
      )}
    </div>
  );
}
