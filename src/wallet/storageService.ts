import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const WALLET_FILE = 'wallet.dat';

type EncryptedWalletFile = {
  v?: 1 | 2;
  kdf?: 'pbkdf2' | 'scrypt';
  kdfParams?: Record<string, number>;
  salt: string;
  iv: string;
  data: string;
};

function getWalletFilePath(): string {
  const userData = app.getPath('userData');
  return path.join(userData, WALLET_FILE);
}

function deriveKeyV1(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha256');
}

function deriveKeyV2Scrypt(password: string, salt: Buffer, params?: Record<string, number>): Buffer {
  const N = params?.N ?? 1 << 15;
  const r = params?.r ?? 8;
  const p = params?.p ?? 1;
  return crypto.scryptSync(password, salt, 32, { N, r, p, maxmem: 256 * 1024 * 1024 });
}

export function encryptWalletPayload(payload: unknown, password: string): EncryptedWalletFile {
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

export function decryptWalletPayload(file: EncryptedWalletFile, password: string): unknown {
  const salt = Buffer.from(file.salt, 'base64');
  const iv = Buffer.from(file.iv, 'base64');
  const full = Buffer.from(file.data, 'base64');

  let key: Buffer;
  if (file.v === 2 && file.kdf === 'scrypt') {
    key = deriveKeyV2Scrypt(password, salt, file.kdfParams);
  } else {
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

export function saveEncryptedWallet(file: EncryptedWalletFile): void {
  const filePath = getWalletFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(file), { encoding: 'utf8' });
}

export function loadEncryptedWallet(): EncryptedWalletFile | null {
  const filePath = getWalletFilePath();
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, { encoding: 'utf8' });
  return JSON.parse(raw) as EncryptedWalletFile;
}

