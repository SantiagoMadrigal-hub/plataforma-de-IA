import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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

const AI_ACTIONS = [
  { id: 'improve', icon: '✨', label: 'Mejorar redacción', instruction: 'Mejora la redacción del texto: corrige la estructura, claridad y fluidez sin cambiar el significado.' },
  { id: 'summarize', icon: '✂️', label: 'Resumir', instruction: 'Resume el texto seleccionado manteniendo solo las ideas principales de forma concisa.' },
  { id: 'expand', icon: '📖', label: 'Expandir', instruction: 'Expande el texto seleccionado añadiendo más detalles, ejemplos y profundidad.' },
  { id: 'professional', icon: '🎯', label: 'Hacer más profesional', instruction: 'Reescribe el texto con un tono más profesional, formal y corporativo.' },
  { id: 'friendly', icon: '😊', label: 'Hacer más amigable', instruction: 'Reescribe el texto con un tono más cercano, conversacional y amigable.' },
  { id: 'translate', icon: '🌍', label: 'Traducir', instruction: 'Traduce el texto al inglés manteniendo el tono y significado original.' },
  { id: 'grammar', icon: '✔️', label: 'Corregir gramática', instruction: 'Corrige errores gramaticales, ortográficos y de puntuación sin cambiar el estilo.' },
  { id: 'continue', icon: '➡️', label: 'Continuar escribiendo', instruction: 'Continúa escribiendo de forma natural a partir del texto seleccionado como si fueras el autor original.' },
];

export function AiBubbleMenu({ editor }: AiBubbleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggerStyle, setTriggerStyle] = useState<React.CSSProperties>({});
  const { rewriteSelection, clearError } = useAiRewrite(editor);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  if (!editor) return null;

  const hasSelection = editor.state.selection.from !== editor.state.selection.to;

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [isOpen]);

  // Position trigger button at selection coordinates
  useLayoutEffect(() => {
    if (!hasSelection || isOpen) {
      setTriggerStyle({ display: 'none' });
      return;
    }

    try {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      const editorCoords = editor.view.dom.getBoundingClientRect();

      setTriggerStyle({
        display: 'flex',
        position: 'absolute',
        left: `${coords.left - editorCoords.left}px`,
        top: `${coords.top - editorCoords.top - 44}px`,
        zIndex: 100,
      });
    } catch {
      setTriggerStyle({ display: 'none' });
    }
  }, [editor, isOpen, hasSelection]);

  const handleAction = async (actionInstruction: string) => {
    setIsRewriting(true);
    setError(null);
    try {
      await rewriteSelection(actionInstruction);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reescribir con IA');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    clearError();
    editor.commands.focus();
  };

  if (!hasSelection && !isOpen) return null;

  return (
    <div className={styles.container} ref={menuRef}>
      {!isOpen && hasSelection && (
        <button
          ref={triggerRef}
          type="button"
          className={styles.trigger}
          onClick={() => setIsOpen(true)}
          aria-label="Acciones de IA sobre la selección"
          style={triggerStyle}
        >
          <SparklesIcon />
          <span>Acciones IA</span>
        </button>
      )}

      {isOpen && (
        <div className={styles.menu} role="dialog" aria-label="Acciones de IA sobre el texto seleccionado">
          <div className={styles.header}>
            <SparklesIcon />
            <span>Acciones IA</span>
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
            <div className={styles.actionsList}>
              {AI_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={styles.actionItem}
                  onClick={() => handleAction(action.instruction)}
                  disabled={isRewriting}
                >
                  <span className={styles.actionIcon} aria-hidden="true">{action.icon}</span>
                  <span className={styles.actionLabel}>{action.label}</span>
                </button>
              ))}
            </div>

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}