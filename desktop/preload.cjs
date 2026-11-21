const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('playmakerNative', {
  saveBackup: payload => ipcRenderer.invoke('save-backup', payload),
  printDocument: html => ipcRenderer.invoke('print-document', html)
});
