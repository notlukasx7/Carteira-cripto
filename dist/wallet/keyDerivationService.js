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
exports.network = void 0;
exports.getRootFromSeed = getRootFromSeed;
exports.deriveMainAccountNode = deriveMainAccountNode;
exports.deriveAddressFromNode = deriveAddressFromNode;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecc = __importStar(require("tiny-secp256k1"));
const bip32_1 = require("bip32");
const network = bitcoin.networks.bitcoin;
exports.network = network;
const bip32 = (0, bip32_1.BIP32Factory)(ecc);
function getRootFromSeed(seed) {
    return bip32.fromSeed(seed, network);
}
// Caminho padrão BIP84 (SegWit nativo) para Bitcoin mainnet: m/84'/0'/0'/0/0
const DEFAULT_PATH = "m/84'/0'/0'/0/0";
function deriveMainAccountNode(root, path = DEFAULT_PATH) {
    return root.derivePath(path);
}
function deriveAddressFromNode(node) {
    const { address } = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(node.publicKey),
        network
    });
    if (!address) {
        throw new Error('Não foi possível gerar o endereço.');
    }
    return address;
}
