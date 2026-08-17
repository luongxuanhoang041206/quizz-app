import { cip68AssetName, deriveNftBaseName } from './cip68.util';

describe('cip68.util', () => {
  it('should create a CIP-68 asset name with prefix and base', () => {
    expect(cip68AssetName('00000010', 'abab')).toBe('00000010abab');
  });

  it('should derive a deterministic 56-char base name', () => {
    const baseName = deriveNftBaseName('quiz-1', 'addr_test1...');
    expect(baseName).toHaveLength(56);
    expect(baseName).toMatch(/^[0-9a-f]+$/);
  });
});
