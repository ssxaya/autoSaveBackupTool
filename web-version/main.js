const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 650,
    minWidth: 650,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'ASBT · 自动存档备份工具 v1.0.0 | by@Yanxiao',
    resizable: true,
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: '选择要备份的文件'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return { type: 'file', path: result.filePaths[0] };
  }
  return null;
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择要备份的文件夹'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return { type: 'directory', path: result.filePaths[0] };
  }
  return null;
});

ipcMain.handle('select-backup-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择备份目录'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-home-path', async () => {
  return app.getPath('home');
});

ipcMain.handle('read-config', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取配置文件失败:', error);
  }
  return null;
});

ipcMain.handle('write-config', async (event, filePath, data) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('写入配置文件失败:', error);
    return false;
  }
});

ipcMain.handle('path-exists', async (event, filePath) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('copy-file', async (event, source, dest) => {
  try {
    fs.copyFileSync(source, dest);
    return true;
  } catch (error) {
    console.error('复制文件失败:', error);
    return false;
  }
});

ipcMain.handle('copy-directory', async (event, source, dest) => {
  try {
    copyDirRecursive(source, dest);
    return true;
  } catch (error) {
    console.error('复制目录失败:', error);
    return false;
  }
});

ipcMain.handle('remove-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (error) {
    console.error('删除文件失败:', error);
    return false;
  }
});

ipcMain.handle('remove-directory', async (event, dirPath) => {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
    return true;
  } catch (error) {
    console.error('删除目录失败:', error);
    return false;
  }
});

ipcMain.handle('ensure-directory', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error('创建目录失败:', error);
    return false;
  }
});

ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        isDirectory: stats.isDirectory(),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    }
  } catch (error) {
    console.error('获取文件状态失败:', error);
  }
  return null;
});

ipcMain.handle('list-directory', async (event, dirPath) => {
  try {
    if (fs.existsSync(dirPath)) {
      return fs.readdirSync(dirPath);
    }
  } catch (error) {
    console.error('读取目录失败:', error);
  }
  return [];
});

function copyDirRecursive(source, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

ipcMain.handle('get-directory-stats', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      return null;
    }

    let totalSize = 0;
    let fileCount = 0;
    let dirCount = 0;

    function calculateSize(currentPath) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      for (let entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          dirCount++;
          calculateSize(fullPath);
        } else {
          fileCount++;
          totalSize += fs.statSync(fullPath).size;
        }
      }
    }

    calculateSize(dirPath);

    const stats = fs.statSync(dirPath);
    return {
      created: stats.birthtime,
      modified: stats.mtime,
      size: totalSize,
      fileCount: fileCount,
      dirCount: dirCount
    };
  } catch (error) {
    console.error('获取目录统计失败:', error);
    return null;
  }
});
