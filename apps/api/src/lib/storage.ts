import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import crypto from 'crypto';

const BUCKET = 'efiimages';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. ' +
        'Image uploads require Supabase Storage. ' +
        'Add these variables to your .env file.',
      );
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

export function isStorageConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a file to Supabase Storage under the user's folder.
 * Files are stored as: {userId}/{category}/{uniqueId}.{ext}
 */
export async function uploadFile(
  userId: string,
  category: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
): Promise<UploadResult> {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(
      `Tipo de archivo no permitido: ${file.mimetype}. ` +
      `Formatos aceptados: JPG, PNG, WebP, GIF.`,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`El archivo excede el límite de ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }

  const client = getClient();
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const storagePath = `${userId}/${category}/${uniqueName}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Error al subir archivo: ${error.message}`);
  }

  const { data: urlData } = client.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return {
    url: urlData.publicUrl,
    path: storagePath,
  };
}

/**
 * Delete a file from Supabase Storage.
 * Only deletes files that belong to the specified user.
 */
export async function deleteFile(userId: string, storagePath: string): Promise<void> {
  if (!storagePath.startsWith(`${userId}/`)) {
    throw new Error('No autorizado para eliminar este archivo.');
  }

  const client = getClient();
  const { error } = await client.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Error al eliminar archivo: ${error.message}`);
  }
}
