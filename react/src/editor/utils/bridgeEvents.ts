export function dispatchEditorEvent<T>(
  mountElement: Element,
  eventName: string,
  detail: T
): void {
  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    composed: true,
  });
  mountElement.dispatchEvent(event);
}

export function dispatchSavedEvent(
  mountElement: Element,
  documentId: string
): void {
  dispatchEditorEvent(mountElement, 'document-editor:saved', { documentId });
}

export function dispatchErrorEvent(
  mountElement: Element,
  error: { code: string; message: string }
): void {
  dispatchEditorEvent(mountElement, 'document-editor:error', { error });
}
