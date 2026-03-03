"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasSavedWallet = hasSavedWallet;
exports.isUnlocked = isUnlocked;
exports.lockWallet = lockWallet;
exports.unlockWalletFromDisk = unlockWalletFromDisk;
exports.createNewWallet = createNewWallet;
exports.restoreWalletFromMnemonic = restoreWalletFromMnemonic;
exports.finalizeWalletCreation = finalizeWalletCreation;
exports.getCurrentAddress = getCurrentAddress;
exports.getWalletBalance = getWalletBalance;
exports.sendPayment = sendPayment;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecc = __importStar(require("tiny-secp256k1"));
const ecpair_1 = require("ecpair");
const seedService_1 = require("./seedService");
const keyDerivationService_1 = require("./keyDerivationService");
const storageService_1 = require("./storageService");
const blockchainApiService_1 = require("./blockchainApiService");
const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
let currentWallet = null;
let unlockedUntilMs = null;
let draftMnemonic = null;
let draftConfirmPositions = null;
function hasSavedWallet() {
    return (0, storageService_1.loadEncryptedWallet)() !== null;
}
function isUnlocked() {
    if (!currentWallet || !unlockedUntilMs)
        return false;
    return Date.now() < unlockedUntilMs;
}
function lockWallet() {
    currentWallet = null;
    unlockedUntilMs = null;
}
async function unlockWalletFromDisk(password, ttlMinutes = 5) {
    try {
        const file = (0, storageService_1.loadEncryptedWallet)();
        if (!file)
            return { success: false, error: 'Nenhuma carteira salva neste computador.' };
        const payload = (0, storageService_1.decryptWalletPayload)(file, password);
        const mnemonic = String((payload === null || payload === void 0 ? void 0 : payload.mnemonic) || '').trim();
        if (!(0, seedService_1.validateMnemonic)(mnemonic)) {
            return { success: false, error: 'Arquivo de carteira inválido ou senha incorreta.' };
        }
        await initializeWalletFromMnemonic(mnemonic, password, false);
        unlockedUntilMs = Date.now() + ttlMinutes * 60000;
        return { success: true };
    }
    catch (err) {
        return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || 'Falha ao desbloquear a carteira.' };
    }
}
async function createNewWallet(password) {
    const mnemonic = await (0, seedService_1.generateMnemonic)(128);
    // Gerar 3 posições aleatórias para o usuário confirmar (1-based)
    const words = mnemonic.trim().split(/\s+/g);
    const positions = new Set();
    while (positions.size < 3) {
        positions.add(1 + Math.floor(Math.random() * words.length));
    }
    const confirmPositions = Array.from(positions).sort((a, b) => a - b);
    draftMnemonic = mnemonic.trim();
    draftConfirmPositions = confirmPositions;
    return { mnemonic: draftMnemonic, confirmPositions };
}
async function restoreWalletFromMnemonic(mnemonic, password) {
    try {
        await initializeWalletFromMnemonic(mnemonic, password, true);
        unlockedUntilMs = Date.now() + 5 * 60000;
        return { success: true };
    }
    catch (err) {
        return {
            success: false,
            error: (err === null || err === void 0 ? void 0 : err.message) || 'Não foi possível restaurar a carteira.'
        };
    }
}
async function finalizeWalletCreation(password, confirmations) {
    var _a;
    try {
        if (!draftMnemonic || !draftConfirmPositions) {
            return { success: false, error: 'Nenhuma criação de carteira pendente.' };
        }
        const words = draftMnemonic.split(/\s+/g);
        for (const pos of draftConfirmPositions) {
            const expected = (words[pos - 1] || '').trim().toLowerCase();
            const provided = (((_a = confirmations.find((c) => c.position === pos)) === null || _a === void 0 ? void 0 : _a.word) || '').trim().toLowerCase();
            if (!provided || provided !== expected) {
                return { success: false, error: `Confirmação inválida. Verifique a palavra #${pos}.` };
            }
        }
        await initializeWalletFromMnemonic(draftMnemonic, password, true);
        unlockedUntilMs = Date.now() + 5 * 60000;
        draftMnemonic = null;
        draftConfirmPositions = null;
        return { success: true };
    }
    catch (err) {
        return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || 'Falha ao finalizar criação da carteira.' };
    }
}
async function initializeWalletFromMnemonic(mnemonic, password, persist) {
    if (!(0, seedService_1.validateMnemonic)(mnemonic)) {
        throw new Error('Mnemonic inválida.');
    }
    const seed = await (0, seedService_1.mnemonicToSeed)(mnemonic);
    const root = (0, keyDerivationService_1.getRootFromSeed)(seed);
    currentWallet = { mnemonic, root };
    if (persist) {
        const payload = { mnemonic: mnemonic.trim() };
        const encrypted = (0, storageService_1.encryptWalletPayload)(payload, password);
        (0, storageService_1.saveEncryptedWallet)(encrypted);
    }
}
function ensureWallet() {
    if (!currentWallet || !isUnlocked()) {
        throw new Error('Nenhuma carteira carregada na sessão.');
    }
    return currentWallet;
}
function getCurrentAddress() {
    const wallet = ensureWallet();
    const accountNode = (0, keyDerivationService_1.deriveMainAccountNode)(wallet.root);
    return (0, keyDerivationService_1.deriveAddressFromNode)(accountNode);
}
async function getWalletBalance() {
    const address = getCurrentAddress();
    const balance = await (0, blockchainApiService_1.getBalanceSats)(address);
    return balance;
}
async function sendPayment(toAddress, amountSats, feeRate) {
    try {
        const wallet = ensureWallet();
        const fromNode = (0, keyDerivationService_1.deriveMainAccountNode)(wallet.root);
        const fromAddress = (0, keyDerivationService_1.deriveAddressFromNode)(fromNode);
        const utxos = await (0, blockchainApiService_1.getUtxos)(fromAddress);
        if (!utxos || utxos.length === 0) {
            return { error: 'Sem UTXOs disponíveis para este endereço.' };
        }
        const selection = selectUtxos(utxos, amountSats, feeRate);
        if (!selection) {
            return { error: 'Saldo insuficiente para valor + taxa.' };
        }
        const { selectedUtxos, change, fee } = selection;
        const psbt = new bitcoin.Psbt({ network: keyDerivationService_1.network });
        if (!fromNode.privateKey) {
            return { error: 'Chave privada indisponível para assinar (nó neutered).' };
        }
        const keyPair = ECPair.fromPrivateKey(Buffer.from(fromNode.privateKey));
        const payment = bitcoin.payments.p2wpkh({
            pubkey: Buffer.from(keyPair.publicKey),
            network: keyDerivationService_1.network
        });
        for (const utxo of selectedUtxos) {
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                witnessUtxo: {
                    script: payment.output,
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
        const txId = await (0, blockchainApiService_1.broadcastTransaction)(rawHex);
        return { txId };
    }
    catch (err) {
        return {
            error: (err === null || err === void 0 ? void 0 : err.message) || 'Erro ao enviar transação.'
        };
    }
}
function selectUtxos(utxos, amountSats, feeRate) {
    const sorted = [...utxos].sort((a, b) => a.value - b.value);
    const selected = [];
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
