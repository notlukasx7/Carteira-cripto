import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import type { BIP32Interface } from 'bip32';

const network = bitcoin.networks.bitcoin;
const bip32 = BIP32Factory(ecc);

export function getRootFromSeed(seed: Buffer): BIP32Interface {
  return bip32.fromSeed(seed, network);
}

// Caminho padrão BIP84 (SegWit nativo) para Bitcoin mainnet: m/84'/0'/0'/0/0
const DEFAULT_PATH = "m/84'/0'/0'/0/0";

export function deriveMainAccountNode(root: BIP32Interface, path: string = DEFAULT_PATH): BIP32Interface {
  return root.derivePath(path);
}

export function deriveAddressFromNode(node: BIP32Interface): string {
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(node.publicKey),
    network
  });

  if (!address) {
    throw new Error('Não foi possível gerar o endereço.');
  }

  return address;
}

export { network };

