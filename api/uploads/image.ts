import type { ServerResponse } from 'http';
import type { VercelRequest, AuthenticatedRequest } from '../../lib/types.js';
import { withAuth } from '../../lib/middleware/withAuth.js';
import { getDb } from '../../lib/db.js';
import { setCorsHeaders, handleOptions, setSecurityHeaders } from '../../lib/cors.js';
import { AppError, sendError } from '../../lib/errors.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

async function handler(req: VercelRequest, res: ServerResponse) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  const authReq = req as AuthenticatedRequest;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa POST' } }));
    return;
  }

  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new AppError('VALIDATION_ERROR', 'Se esperaba multipart/form-data', 400);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const body = Buffer.concat(chunks);

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      throw new AppError('VALIDATION_ERROR', 'Boundary no encontrado', 400);
    }

    const parts = parseMultipart(body, boundary);
    const imagePart = parts.find(p => p.name === 'image');
    
    if (!imagePart || !imagePart.data) {
      throw new AppError('VALIDATION_ERROR', 'No se proporcionó una imagen', 400);
    }

    if (!ALLOWED_TYPES.includes(imagePart.contentType || '')) {
      throw new AppError('VALIDATION_ERROR', 'Tipo de archivo no soportado. Usa JPG, PNG, GIF o WebP.', 400);
    }

    if (imagePart.data.length > MAX_SIZE) {
      throw new AppError('VALIDATION_ERROR', 'El archivo excede el límite de 5MB', 400);
    }

    const db = getDb();
    const fileExt = (imagePart.contentType || 'image/jpeg').split('/')[1] || 'jpg';
    const fileName = `${authReq.user.id}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await db.storage
      .from('uploads')
      .upload(fileName, imagePart.data, {
        contentType: imagePart.contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new AppError('UPLOAD_FAILED', 'Error al subir la imagen', 500);
    }

    const { data: urlData } = db.storage
      .from('uploads')
      .getPublicUrl(fileName);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      url: urlData.publicUrl,
      width: 0,
      height: 0,
    }));
  } catch (err) {
    sendError(res, err);
  }
}

interface MultipartPart {
  name: string;
  filename?: string;
  contentType?: string;
  data: Buffer;
}

function parseMultipart(body: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundary = Buffer.from(`--${boundary}--`);
  
  let start = body.indexOf(boundaryBuffer) + boundaryBuffer.length + 2;
  
  while (start < body.length) {
    const end = body.indexOf(boundaryBuffer, start);
    if (end === -1) break;
    
    const partData = body.slice(start, end - 2);
    const headerEnd = partData.indexOf('\r\n\r\n');
    
    if (headerEnd === -1) {
      start = end + boundaryBuffer.length + 2;
      continue;
    }
    
    const headers = partData.slice(0, headerEnd).toString();
    const data = partData.slice(headerEnd + 4);
    
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*(.+)/i);
    
    parts.push({
      name: nameMatch?.[1] || '',
      filename: filenameMatch?.[1],
      contentType: contentTypeMatch?.[1]?.trim(),
      data,
    });
    
    start = end + boundaryBuffer.length + 2;
  }
  
  return parts;
}

export default withAuth(handler);
