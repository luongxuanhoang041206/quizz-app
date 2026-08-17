import crypto from 'crypto';

const nodeCrypto = crypto as typeof import('crypto');

export const CIP68_REF_PREFIX = '00000010';
export const CIP68_USER_PREFIX = '000643b0';

/**
 * Build a CIP-68 asset name by prepending the 4-byte label prefix to a
 * hex-encoded base name.
 *
 * @param prefix - 8 hex-char label (e.g. CIP68_REF_PREFIX)
 * @param baseName - hex-encoded base name (e.g. SHA-256 truncated, or quiz id)
 */
export function cip68AssetName(prefix: string, baseName: string): string {
  return prefix + baseName;
}

/**
 * Derive a unique, deterministic base name for an NFT from the quiz ID
 * and user address.
 *
 * The first 28 bytes (56 hex chars) of SHA-256 are used so the full
 * 32-byte asset name fits the Cardano asset name limit.
 */
export function deriveNftBaseName(
  quizId: string,
  userAddress: string,
): string {
  const input = `${quizId}:${userAddress}`;
  const hash = nodeCrypto
    .createHash('sha256')
    .update(input, 'utf-8')
    .digest('hex');
  return hash.slice(0, 56);
}
