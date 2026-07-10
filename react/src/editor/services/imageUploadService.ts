interface UploadResult {
  url: string;
  width: number;
  height: number;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

function getBaseUrl(): string {
  const port = window.location.port;
  if (port === '3000' || port === '5173') {
    return `http://localhost:${port}`;
  }
  return '';
}

export const imageUploadService = {
  async upload(file: File): Promise<UploadResult> {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Tipo de archivo no soportado. Usa JPG, PNG, GIF o WebP.');
    }

    if (file.size > MAX_SIZE) {
      throw new Error('El archivo excede el límite de 5MB.');
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${getBaseUrl()}/api/uploads/image`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al subir la imagen');
    }

    return response.json();
  },
};
