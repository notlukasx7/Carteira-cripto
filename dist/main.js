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
const electron_1 = require("electron");
const path = __importStar(require("path"));
const walletService_1 = require("./wallet/walletService");
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    const isDev = !electron_1.app.isPackaged;
    const indexHtml = isDev
        ? path.join(__dirname, '..', 'src', 'renderer', 'index.html')
        : path.join(__dirname, 'renderer', 'index.html');
    mainWindow.loadFile(indexHtml).catch(() => {
        // fallback: tenta carregar do dist se falhar
        const fallback = path.join(__dirname, 'renderer', 'index.html');
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.loadFile(fallback);
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// IPC handlers para a wallet
electron_1.ipcMain.handle('wallet:create', async (_event, password) => {
    return (0, walletService_1.createNewWallet)(password);
});
electron_1.ipcMain.handle('wallet:finalizeCreate', async (_event, password, confirmations) => {
    return (0, walletService_1.finalizeWalletCreation)(password, confirmations);
});
electron_1.ipcMain.handle('wallet:restore', async (_event, mnemonic, password) => {
    return (0, walletService_1.restoreWalletFromMnemonic)(mnemonic, password);
});
electron_1.ipcMain.handle('wallet:unlock', async (_event, password, ttlMinutes) => {
    return (0, walletService_1.unlockWalletFromDisk)(password, typeof ttlMinutes === 'number' ? ttlMinutes : 5);
});
electron_1.ipcMain.handle('wallet:lock', async () => {
    (0, walletService_1.lockWallet)();
    return { success: true };
});
electron_1.ipcMain.handle('wallet:hasSaved', async () => {
    return { hasSaved: (0, walletService_1.hasSavedWallet)() };
});
electron_1.ipcMain.handle('wallet:isUnlocked', async () => {
    return { unlocked: (0, walletService_1.isUnlocked)() };
});
electron_1.ipcMain.handle('wallet:getAddress', async () => {
    return (0, walletService_1.getCurrentAddress)();
});
electron_1.ipcMain.handle('wallet:getBalance', async () => {
    return (0, walletService_1.getWalletBalance)();
});
electron_1.ipcMain.handle('wallet:send', async (_event, toAddress, amountSats, feeRate) => {
    return (0, walletService_1.sendPayment)(toAddress, amountSats, feeRate);
});
