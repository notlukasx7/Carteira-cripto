import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('walletApi', {
  createWallet: (password: string) => ipcRenderer.invoke('wallet:create', password),
  finalizeCreate: (password: string, confirmations: Array<{ position: number; word: string }>) =>
    ipcRenderer.invoke('wallet:finalizeCreate', password, confirmations),
  restoreWallet: (mnemonic: string, password: string) => ipcRenderer.invoke('wallet:restore', mnemonic, password),
  unlockWallet: (password: string, ttlMinutes?: number) => ipcRenderer.invoke('wallet:unlock', password, ttlMinutes),
  lockWallet: () => ipcRenderer.invoke('wallet:lock'),
  hasSavedWallet: () => ipcRenderer.invoke('wallet:hasSaved'),
  isUnlocked: () => ipcRenderer.invoke('wallet:isUnlocked'),
  getAddress: () => ipcRenderer.invoke('wallet:getAddress'),
  getBalance: () => ipcRenderer.invoke('wallet:getBalance'),
  sendTransaction: (toAddress: string, amountSats: number, feeRate: number) =>
    ipcRenderer.invoke('wallet:send', toAddress, amountSats, feeRate)
});

