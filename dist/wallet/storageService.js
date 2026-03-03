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
exports.encryptWalletPayload = encryptWalletPayload;
exports.decryptWalletPayload = decryptWalletPayload;
exports.saveEncryptedWallet = saveEncryptedWallet;
exports.loadEncryptedWallet = loadEncryptedWallet;
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const WALLET_FILE = 'wallet.dat';
function getWalletFilePath() {
    const userData = electron_1.app.getPath('userData');
    return path.join(userData, WALLET_FILE);
}
function deriveKeyV1(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}
function deriveKeyV2Scrypt(password, salt, params) {
    var _a, _b, _c;
    const N = (_a = params === null || params === void 0 ? void 0 : params.N) !== null && _a !== void 0 ? _a : 1 << 15;
    const r = (_b = params === null || params === void 0 ? void 0 : params.r) !== null && _b !== void 0 ? _b : 8;
    const p = (_c = params === null || params === void 0 ? void 0 : params.p) !== null && _c !== void 0 ? _c : 1;
    return crypto.scryptSync(password, salt, 32, { N, r, p, maxmem: 256 * 1024 * 1024 });
}
function encryptWalletPayload(payload, password) {
    const salt = crypto.randomBytes(16);
    const kdfParams = { N: 1 << 15, r: 8, p: 1 };
    const key = deriveKeyV2Scrypt(password, salt, kdfParams);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const json = JSON.stringify(payload);
    const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const full = Buffer.concat([encrypted, authTag]);
    return {
        v: 2,
        kdf: 'scrypt',
        kdfParams,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        data: full.toString('base64')
    };
}
function decryptWalletPayload(file, password) {
    const salt = Buffer.from(file.salt, 'base64');
    const iv = Buffer.from(file.iv, 'base64');
    const full = Buffer.from(file.data, 'base64');
    let key;
    if (file.v === 2 && file.kdf === 'scrypt') {
        key = deriveKeyV2Scrypt(password, salt, file.kdfParams);
    }
    else {
        // compat: arquivos antigos (pbkdf2)
        key = deriveKeyV1(password, salt);
    }
    const authTag = full.slice(full.length - 16);
    const encrypted = full.slice(0, full.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const json = decrypted.toString('utf8');
    return JSON.parse(json);
}
function saveEncryptedWallet(file) {
    const filePath = getWalletFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(file), { encoding: 'utf8' });
}
function loadEncryptedWallet() {
    const filePath = getWalletFilePath();
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const raw = fs.readFileSync(filePath, { encoding: 'utf8' });
    return JSON.parse(raw);
}
