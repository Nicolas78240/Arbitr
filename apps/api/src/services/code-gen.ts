import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export function generateCode(length = 6): string {
  return randomBytes(length)
    .toString('base64url')
    .replace(/[^A-Z0-9]/gi, '')
    .substring(0, length)
    .toUpperCase();
}

export async function hashCode(plainCode: string): Promise<string> {
  return bcrypt.hash(plainCode, SALT_ROUNDS);
}
