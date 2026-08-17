import { AchievementMetadata } from '../../achievement/interfaces/achievement.interface';
import crypto from 'crypto';

const nodeCrypto = crypto as typeof import('crypto');

export function sha256Hex(data: Buffer): string {
  return nodeCrypto.createHash('sha256').update(data).digest('hex');
}

export function hashAchievementJson(metadata: AchievementMetadata): {
  jsonBuffer: Buffer;
  sha256Hex: string;
} {
  // Canonical JSON: sorted keys, no trailing newline
  const jsonString = JSON.stringify(metadata, Object.keys(metadata).sort());
  const jsonBuffer = Buffer.from(jsonString, 'utf-8');
  return { jsonBuffer, sha256Hex: sha256Hex(jsonBuffer) };
}

/** Convert a plain UTF-8 string to its hex representation. */
export function utf8ToHex(str: string): string {
  return Buffer.from(str, 'utf-8').toString('hex');
}

/** Convert a hex string to a Buffer. */
export function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}
