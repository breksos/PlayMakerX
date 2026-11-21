const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 860,
    minHeight: 620,
    title: 'Playmaker Tackle',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

app.whenReady().then(() => {
  ipcMain.handle('save-backup', async (event, payload) => {
    if (event.sender !== mainWindow?.webContents || typeof payload?.contents !== 'string' || payload.contents.length > 20_000_000) return;
    const suggested = path.basename(String(payload.filename || 'tackle-playbook.json'));
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save playbook backup',
      defaultPath: suggested,
      filters: [{ name: 'JSON backup', extensions: ['json'] }]
    });
    if (!canceled && filePath) await fs.writeFile(filePath, payload.contents, 'utf8');
  });

  ipcMain.handle('print-document', async (event, html) => {
    if (event.sender !== mainWindow?.webContents || typeof html !== 'string' || html.length > 10_000_000) return;
    const preview = new BrowserWindow({ show: false, webPreferences: { sandbox: true, nodeIntegration: false } });
    try {
      await preview.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      await new Promise(resolve => preview.webContents.print({ silent: false, printBackground: true }, resolve));
    } finally {
      preview.close();
    }
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
