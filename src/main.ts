import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

import {
  createNewWallet,
  finalizeWalletCreation,
  restoreWalletFromMnemonic,
  unlockWalletFromDisk,
  lockWallet,
  hasSavedWallet,
  isUnlocked,
  getCurrentAddress,
  getWalletBalance,
  sendPayment
} from './wallet/walletService';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged;
  const indexHtml = isDev
    ? path.join(__dirname, '..', 'src', 'renderer', 'index.html')
    : path.join(__dirname, 'renderer', 'index.html');
  mainWindow.loadFile(indexHtml).catch(() => {
    // fallback: tenta carregar do dist se falhar
    const fallback = path.join(__dirname, 'renderer', 'index.html');
    mainWindow?.loadFile(fallback);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers para a wallet
ipcMain.handle('wallet:create', async (_event, password: string) => {
  return createNewWallet(password);
});

ipcMain.handle(
  'wallet:finalizeCreate',
  async (_event, password: string, confirmations: Array<{ position: number; word: string }>) => {
    return finalizeWalletCreation(password, confirmations);
  }
);

ipcMain.handle('wallet:restore', async (_event, mnemonic: string, password: string) => {
  return restoreWalletFromMnemonic(mnemonic, password);
});

ipcMain.handle('wallet:unlock', async (_event, password: string, ttlMinutes?: number) => {
  return unlockWalletFromDisk(password, typeof ttlMinutes === 'number' ? ttlMinutes : 5);
});

ipcMain.handle('wallet:lock', async () => {
  lockWallet();
  return { success: true };
});

ipcMain.handle('wallet:hasSaved', async () => {
  return { hasSaved: hasSavedWallet() };
});

ipcMain.handle('wallet:isUnlocked', async () => {
  return { unlocked: isUnlocked() };
});

ipcMain.handle('wallet:getAddress', async () => {
  return getCurrentAddress();
});

ipcMain.handle('wallet:getBalance', async () => {
  return getWalletBalance();
});

ipcMain.handle('wallet:send', async (_event, toAddress: string, amountSats: number, feeRate: number) => {
  return sendPayment(toAddress, amountSats, feeRate);
});

