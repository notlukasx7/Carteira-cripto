"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('walletApi', {
    createWallet: (password) => electron_1.ipcRenderer.invoke('wallet:create', password),
    finalizeCreate: (password, confirmations) => electron_1.ipcRenderer.invoke('wallet:finalizeCreate', password, confirmations),
    restoreWallet: (mnemonic, password) => electron_1.ipcRenderer.invoke('wallet:restore', mnemonic, password),
    unlockWallet: (password, ttlMinutes) => electron_1.ipcRenderer.invoke('wallet:unlock', password, ttlMinutes),
    lockWallet: () => electron_1.ipcRenderer.invoke('wallet:lock'),
    hasSavedWallet: () => electron_1.ipcRenderer.invoke('wallet:hasSaved'),
    isUnlocked: () => electron_1.ipcRenderer.invoke('wallet:isUnlocked'),
    getAddress: () => electron_1.ipcRenderer.invoke('wallet:getAddress'),
    getBalance: () => electron_1.ipcRenderer.invoke('wallet:getBalance'),
    sendTransaction: (toAddress, amountSats, feeRate) => electron_1.ipcRenderer.invoke('wallet:send', toAddress, amountSats, feeRate)
});
