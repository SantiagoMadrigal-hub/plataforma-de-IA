import { useState, useEffect } from 'react';
import type { DocumentEditorProps, EditorMode } from '../types/editor.types';

function waitForContentFlowApp(timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.ContentFlowApp) {
      resolve(true);
      return;
    }

    const onReady = () => {
      window.removeEventListener('ContentFlowReady', onReady);
      resolve(true);
    };

    window.addEventListener('ContentFlowReady', onReady);

    setTimeout(() => {
      window.removeEventListener('ContentFlowReady', onReady);
      resolve(!!window.ContentFlowApp);
    }, timeout);
  });
}

export function useEditorBridgeProps(mountElement: Element | null): DocumentEditorProps {
  const [props, setProps] = useState<DocumentEditorProps>({
    mode: 'create',
  });

  useEffect(() => {
    if (!mountElement) return;

    const mode = (mountElement.getAttribute('data-mode') as EditorMode) || 'create';
    const documentId = mountElement.getAttribute('data-document-id') || undefined;
    const initialFormat = mountElement.getAttribute('data-format') || undefined;
    const initialTone = mountElement.getAttribute('data-tone') || undefined;
    const initialContent = mountElement.getAttribute('data-initial-content') || undefined;

    setProps({
      mode,
      documentId: mode === 'edit' ? documentId : undefined,
      initialFormat: initialFormat || undefined,
      initialTone: initialTone || undefined,
      initialContent: initialContent || undefined,
    });
  }, [mountElement]);

  return props;
}

export { waitForContentFlowApp };
