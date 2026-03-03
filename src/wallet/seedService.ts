import * as bip39 from 'bip39';

export async function generateMnemonic(strength: 128 | 256 = 128): Promise<string> {
  const mnemonic = bip39.generateMnemonic(strength);
  return mnemonic;
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim());
}

export async function mnemonicToSeed(mnemonic: string): Promise<Buffer> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Mnemonic inválida');
  }
  const seed = await bip39.mnemonicToSeed(mnemonic.trim());
  return seed;
}

