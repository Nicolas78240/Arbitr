import { FastifyInstance } from 'fastify';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

interface AuthUser {
  sub: string;
  role: 'ADMIN' | 'EVALUATOR' | 'TEAM';
  sessionId: string;
  name: string;
}

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg',
]);

const UPLOADS_DIR = join(process.cwd(), 'uploads');

export async function registerUploadRoutes(app: FastifyInstance): Promise<void> {
  // Ensure uploads directory exists
  await mkdir(UPLOADS_DIR, { recursive: true });

  const teamPreValidation = [app.authenticate, app.requireRole('TEAM')];

  // POST /upload — Upload a file (TEAM only)
  app.post('/upload', {
    preValidation: teamPreValidation,
  }, async (request, reply) => {
    const user = request.user as AuthUser;

    const data = await request.file();

    if (!data) {
      return reply.code(400).send({
        error: 'NO_FILE',
        message: 'No file was uploaded',
        statusCode: 400,
      });
    }

    const originalName = data.filename;
    const ext = extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      // Consume the stream to avoid hanging
      await data.toBuffer();
      return reply.code(400).send({
        error: 'INVALID_FILE_TYPE',
        message: `File type "${ext}" is not allowed. Accepted: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
        statusCode: 400,
      });
    }

    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = join(UPLOADS_DIR, uniqueName);

    try {
      await pipeline(data.file, createWriteStream(filePath));
    } catch (err) {
      app.log.error(err, 'File upload failed');
      return reply.code(500).send({
        error: 'UPLOAD_FAILED',
        message: 'Failed to save uploaded file',
        statusCode: 500,
      });
    }

    // Check if file exceeded size limit (stream may have been truncated)
    if (data.file.truncated) {
      // Clean up the partial file
      const { unlink } = await import('node:fs/promises');
      await unlink(filePath).catch(() => {});
      return reply.code(413).send({
        error: 'FILE_TOO_LARGE',
        message: 'File exceeds the 10 MB size limit',
        statusCode: 413,
      });
    }

    return reply.code(201).send({
      fileUrl: `/uploads/${uniqueName}`,
      fileName: originalName,
    });
  });
}
