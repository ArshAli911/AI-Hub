import { storageAdmin } from '../config/firebaseAdmin';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

/**
 * Uploads a file buffer to Firebase Storage.
 * @param fileBuffer The buffer of the file to upload.
 * @param mimetype The MIME type of the file.
 * @param folder The folder within the storage bucket to upload to (e.g., 'prototypes', 'avatars').
 * @returns The public download URL of the uploaded file.
 */
export const uploadFileToFirebase = async (
  fileBuffer: Buffer,
  mimetype: string,
  folder: string
): Promise<string> => {
  const bucket = storageAdmin.bucket();
  const fileName = `${folder}/${uuidv4()}-${Date.now()}`;
  const file = bucket.file(fileName);

  return new Promise((resolve, reject) => {
    const stream = file.createWriteStream({
      metadata: {
        contentType: mimetype,
      },
    });

    stream.on('error', (err) => {
      console.error('Error uploading to Firebase Storage:', err);
      reject(new Error('Failed to upload file to Firebase Storage'));
    });

    stream.on('finish', async () => {
      try {
        await file.makePublic(); // Make the file publicly accessible
        const publicUrl = file.publicUrl();
        resolve(publicUrl);
      } catch (err) {
        console.error('Error making file public or getting URL:', err);
        reject(new Error('Failed to get public URL for uploaded file'));
      }
    });

    stream.end(fileBuffer);
  });
}; 