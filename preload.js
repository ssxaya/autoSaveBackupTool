const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadGlobalConfig: () => ipcRenderer.invoke('config:loadGlobal'),
  saveGlobalConfig: (config) => ipcRenderer.invoke('config:saveGlobal', config),
  loadBackupConfig: (backupDir) => ipcRenderer.invoke('config:loadBackup', backupDir),
  saveBackupConfig: (backupDir, config) => ipcRenderer.invoke('config:saveBackup', { backup_dir: backupDir, config }),
  checkOldConfig: () => ipcRenderer.invoke('config:checkOld'),

  selectSource: () => ipcRenderer.invoke('dialog:selectSource'),
  selectSourceDir: () => ipcRenderer.invoke('dialog:selectSourceDir'),
  selectBackupDir: () => ipcRenderer.invoke('dialog:selectBackupDir'),

  performBackup: (sourcePath, backupDir, isDirectory) => ipcRenderer.invoke('backup:perform', { sourcePath, backupDir, isDirectory }),
  restoreBackup: (backupPath, originalPath, isDirectory) => ipcRenderer.invoke('backup:restore', { backupPath, originalPath, isDirectory }),
  deleteBackup: (backupPath, isDirectory) => ipcRenderer.invoke('backup:delete', { backupPath, isDirectory }),

  getDirectoryStats: (dirPath) => ipcRenderer.invoke('dir:getStats', dirPath),
  listDirectoryContents: (dirPath) => ipcRenderer.invoke('dir:listContents', dirPath),
  readFilePreview: (filePath) => ipcRenderer.invoke('file:readPreview', filePath),

  startAutoBackup: (intervalMinutes, sourcePath, backupDir, isDirectory) => ipcRenderer.invoke('timer:start', { intervalMinutes, sourcePath, backupDir, isDirectory }),
  stopAutoBackup: () => ipcRenderer.invoke('timer:stop'),

  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getAnnouncements: () => ipcRenderer.invoke('app:getAnnouncements'),

  onAutoBackupDone: (callback) => {
    ipcRenderer.on('backup:auto-done', (event, data) => callback(data));
  },
  removeAutoBackupListener: () => {
    ipcRenderer.removeAllListeners('backup:auto-done');
  }
});
