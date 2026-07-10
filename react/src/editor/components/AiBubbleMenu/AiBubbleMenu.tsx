import React, { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import { useAiRewrite } from '../../hooks/useAiRewrite';
import styles from './AiBubbleMenu.module.css';

interface AiBubbleMenuProps {
  editor: Editor | null;
}

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

export function AiBubbleMenu({ editor }: AiBubbleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const { isRewriting, error, rewriteSelection, clearError } = useAiRewrite(editor);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!editor) return null;

  const hasSelection = editor.state.selection.from !== editor.state.selection.to;

  const handleRewrite = async () => {
    await rewriteSelection(instruction || undefined);
    setIsOpen(false);
    setInstruction('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setInstruction('');
    clearError();
    editor.commands.focus();
  };

  if (!hasSelection && !isOpen) return null;

  return (
    <div className={styles.container}>
      {!isOpen && hasSelection && (
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setIsOpen(true)}
          aria-label="Mejorar selección con IA"
        >
          <SparklesIcon />
          <span>Mejorar con IA</span>
        </button>
      )}

      {isOpen && (
        <div className={styles.menu} role="dialog" aria-label="Mejorar con IA">
          <div className={styles.header}>
            <SparklesIcon />
            <span>Mejorar con IA</span>
            <button
              type="button"
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div className={styles.body}>
            <input
              ref={inputRef}
              type="text"
              className={styles.input}
              placeholder="Instrucción opcional (ej: hazlo más formal)"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRewriting) {
                  handleRewrite();
                }
                if (e.key === 'Escape') {
                  handleClose();
                }
              }}
              disabled={isRewriting}
            />

            {error && (
              <div className={styles.error} role="alert">
                {error.message}
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleClose}
                disabled={isRewriting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.rewriteButton}
                onClick={handleRewrite}
                disabled={isRewriting}
              >
                {isRewriting ? 'Mejorando...' : 'Mejorar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
