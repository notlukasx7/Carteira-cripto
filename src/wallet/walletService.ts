import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import type { BIP32Interface } from 'bip32';

import { generateMnemonic, mnemonicToSeed, validateMnemonic } from './seedService';
import { getRootFromSeed, deriveMainAccountNode, deriveAddressFromNode, network } from './keyDerivationService';
import { decryptWalletPayload, encryptWalletPayload, loadEncryptedWallet, saveEncryptedWallet } from './storageService';
import { getBalanceSats, getUtxos, broadcastTransaction, Utxo } from './blockchainApiService';

const ECPair = ECPairFactory(ecc);

type InMemoryWallet = {
  mnemonic: string;
  root: BIP32Interface;
};

let currentWallet: InMemoryWallet | null = null;
let unlockedUntilMs: number | null = null;

let draftMnemonic: string | null = null;
let draftConfirmPositions: number[] | null = null;

type CreateWalletResult = {
  mnemonic: string;
  confirmPositions: number[];
};

type RestoreWalletResult = {
  success: boolean;
  error?: string;
};

type SendPaymentResult = {
  txId?: string;
  error?: string;
};

export function hasSavedWallet(): boolean {
  return loadEncryptedWallet() !== null;
}

export function isUnlocked(): boolean {
  if (!currentWallet || !unlockedUntilMs) return false;
  return Date.now() < unlockedUntilMs;
}

export function lockWallet(): void {
  currentWallet = null;
  unlockedUntilMs = null;
}

export async function unlockWalletFromDisk(password: string, ttlMinutes: number = 5): Promise<{ success: boolean; error?: string }> {
  try {
    const file = loadEncryptedWallet();
    if (!file) return { success: false, error: 'Nenhuma carteira salva neste computador.' };

    const payload = decryptWalletPayload(file, password) as any;
    const mnemonic = String(payload?.mnemonic || '').trim();
    if (!validateMnemonic(mnemonic)) {
      return { success: false, error: 'Arquivo de carteira inválido ou senha incorreta.' };
    }

    await initializeWalletFromMnemonic(mnemonic, password, false);
    unlockedUntilMs = Date.now() + ttlMinutes * 60_000;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao desbloquear a carteira.' };
  }
}

export async function createNewWallet(password: string): Promise<CreateWalletResult> {
  const mnemonic = await generateMnemonic(128);
  // Gerar 3 posições aleatórias para o usuário confirmar (1-based)
  const words = mnemonic.trim().split(/\s+/g);
  const positions = new Set<number>();
  while (positions.size < 3) {
    positions.add(1 + Math.floor(Math.random() * words.length));
  }
  const confirmPositions = Array.from(positions).sort((a, b) => a - b);

  draftMnemonic = mnemonic.trim();
  draftConfirmPositions = confirmPositions;
  return { mnemonic: draftMnemonic, confirmPositions };
}

export async function restoreWalletFromMnemonic(
  mnemonic: string,
  password: string
): Promise<RestoreWalletResult> {
  try {
    await initializeWalletFromMnemonic(mnemonic, password, true);
    unlockedUntilMs = Date.now() + 5 * 60_000;
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Não foi possível restaurar a carteira.'
    };
  }
}

export async function finalizeWalletCreation(
  password: string,
  confirmations: Array<{ position: number; word: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!draftMnemonic || !draftConfirmPositions) {
      return { success: false, error: 'Nenhuma criação de carteira pendente.' };
    }

    const words = draftMnemonic.split(/\s+/g);
    for (const pos of draftConfirmPositions) {
      const expected = (words[pos - 1] || '').trim().toLowerCase();
      const provided = (confirmations.find((c) => c.position === pos)?.word || '').trim().toLowerCase();
      if (!provided || provided !== expected) {
        return { success: false, error: `Confirmação inválida. Verifique a palavra #${pos}.` };
      }
    }

    await initializeWalletFromMnemonic(draftMnemonic, password, true);
    unlockedUntilMs = Date.now() + 5 * 60_000;

    draftMnemonic = null;
    draftConfirmPositions = null;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao finalizar criação da carteira.' };
  }
}

async function initializeWalletFromMnemonic(mnemonic: string, password: string, persist: boolean): Promise<void> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Mnemonic inválida.');
  }

  const seed = await mnemonicToSeed(mnemonic);
  const root = getRootFromSeed(seed);

  currentWallet = { mnemonic, root };

  if (persist) {
    const payload = { mnemonic: mnemonic.trim() };
    const encrypted = encryptWalletPayload(payload, password);
    saveEncryptedWallet(encrypted);
  }
}

function ensureWallet(): InMemoryWallet {
  if (!currentWallet || !isUnlocked()) {
    throw new Error('Nenhuma carteira carregada na sessão.');
  }
  return currentWallet;
}

export function getCurrentAddress(): string {
  const wallet = ensureWallet();
  const accountNode = deriveMainAccountNode(wallet.root);
  return deriveAddressFromNode(accountNode);
}

export async function getWalletBalance(): Promise<number> {
  const address = getCurrentAddress();
  const balance = await getBalanceSats(address);
  return balance;
}

export async function sendPayment(
  toAddress: string,
  amountSats: number,
  feeRate: number
): Promise<SendPaymentResult> {
  try {
    const wallet = ensureWallet();
    const fromNode = deriveMainAccountNode(wallet.root);
    const fromAddress = deriveAddressFromNode(fromNode);

    const utxos = await getUtxos(fromAddress);
    if (!utxos || utxos.length === 0) {
      return { error: 'Sem UTXOs disponíveis para este endereço.' };
    }

    const selection = selectUtxos(utxos, amountSats, feeRate);
    if (!selection) {
      return { error: 'Saldo insuficiente para valor + taxa.' };
    }

    const { selectedUtxos, change, fee } = selection;

    const psbt = new bitcoin.Psbt({ network });

    if (!fromNode.privateKey) {
      return { error: 'Chave privada indisponível para assinar (nó neutered).' };
    }
    const keyPair = ECPair.fromPrivateKey(Buffer.from(fromNode.privateKey));
    const payment = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(keyPair.publicKey),
      network
    });

    for (const utxo of selectedUtxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: payment.output as Buffer,
          value: BigInt(utxo.value)
        }
      });
    }

    psbt.addOutput({
      address: toAddress,
      value: BigInt(amountSats)
    });

    if (change > 0) {
      psbt.addOutput({
        address: fromAddress,
        value: BigInt(change)
      });
    }

    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    const rawHex = tx.toHex();
    const txId = await broadcastTransaction(rawHex);

    return { txId };
  } catch (err: any) {
    return {
      error: err?.message || 'Erro ao enviar transação.'
    };
  }
}

function selectUtxos(
  utxos: Utxo[],
  amountSats: number,
  feeRate: number
): { selectedUtxos: Utxo[]; change: number; fee: number } | null {
  const sorted = [...utxos].sort((a, b) => a.value - b.value);
  const selected: Utxo[] = [];
  let total = 0;

  for (const utxo of sorted) {
    selected.push(utxo);
    total += utxo.value;
    const inCount = selected.length;
    const outCount = 2;
    const estimatedSize = 10 + inCount * 68 + outCount * 31;
    const fee = feeRate * estimatedSize;
    const required = amountSats + fee;

    if (total >= required) {
      const change = total - amountSats - fee;
      return { selectedUtxos: selected, change, fee };
    }
  }

  return null;
}

