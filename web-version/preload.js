const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectBackupDir: () => ipcRenderer.invoke('select-backup-dir'),
  getHomePath: () => ipcRenderer.invoke('get-home-path'),
  readConfig: (filePath) => ipcRenderer.invoke('read-config', filePath),
  writeConfig: (filePath, data) => ipcRenderer.invoke('write-config', filePath, data),
  pathExists: (filePath) => ipcRenderer.invoke('path-exists', filePath),
  copyFile: (source, dest) => ipcRenderer.invoke('copy-file', source, dest),
  copyDirectory: (source, dest) => ipcRenderer.invoke('copy-directory', source, dest),
  removeFile: (filePath) => ipcRenderer.invoke('remove-file', filePath),
  removeDirectory: (dirPath) => ipcRenderer.invoke('remove-directory', dirPath),
  ensureDirectory: (dirPath) => ipcRenderer.invoke('ensure-directory', dirPath),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
  listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
  getDirectoryStats: (dirPath) => ipcRenderer.invoke('get-directory-stats', dirPath)
});
