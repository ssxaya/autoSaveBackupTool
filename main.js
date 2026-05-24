const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let autoBackupIntervalId = null;

const DEFAULT_GLOBAL_CONFIG = {
  source_path: "",
  is_directory: false,
  backup_dir: "",
  backup_dirs: [],
  interval: 5
};

const DEFAULT_BACKUP_CONFIG = {
  backups: [],
  logs: []
};

const ANNOUNCEMENTS = [
  { content: "v0.2版本更新：支持文件夹备份，可以备份整个游戏存档目录", date: "2025-04-28" },
  { content: "v0.4版本更新：新增日志与日志详情，右键日志即可进行回溯操作。优化窗口位置", date: "2025-04-29" },
  { content: "dev-v0.5版本更新：配置系统更新，数据配置文件(如历史、日志)保存在存档目录路径，基础设置保存用户目录", date: "2025-4-29" },
  { content: "dev-v0.5.1版本更新：公告更新，鼠标移动到公告栏会开始滚动，避免字数过长导致按钮位置问题", date: "2025-5-6" },
  { content: "dev-v0.5.2版本更新：兼容旧版本配置文件，启动时检测C:\\Users\\~\\.game_backup_tool目录下的config.json文件", date: "2025-5-6" },
  { content: "v0.5.3版本更新：新增旧版本配置迁移的历史记录与日志", date: "2025-5-6" },
  { content: "v0.6版本更新：新增历史备份目录列表进行管理（右键有更多选项）", date: "2025-5-7" },
  { content: "v0.6.1版本更新：右键备份列表可以还原与删除", date: "2025-5-7" },
  { content: "v0.6.2版本更新：状态栏状态数量更新、备份文件名时间戳精度提升至毫秒，修复了历史备份目录列表中删除某个目录后还会显示的问题", date: "2025-5-8" },
  { content: "v1.0.0版本更新：全面重构为Electron + Web架构，现代化UI体验，完全本地离线运行", date: "2025-5-24" }
];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 620,
    resizable: true,
    center: true,
    title: 'ASBT · 自动存档备份工具 v1.0.0 | by@Yanxiao',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getGlobalConfigPath() {
  return path.join(app.getPath('home'), 'autoSaveBackupTool_config.json');
}

function getOldConfigPath() {
  return path.join(app.getPath('home'), '.game_backup_tool', 'config.json');
}

function formatSize(sizeBytes) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  } else if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(2)} KB`;
  } else if (sizeBytes < 1024 * 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

function generateTimestamp() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${y}${mo}${d}_${h}${mi}${s}_${ms}`;
}

function formatDate() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

function countDirRecursive(dirPath) {
  let fileCount = 0;
  let dirCount = 0;
  let totalSize = 0;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        dirCount++;
        walk(fullPath);
      } else if (entry.isFile()) {
        fileCount++;
        try {
          totalSize += fs.statSync(fullPath).size;
        } catch (e) {}
      }
    }
  }

  try {
    walk(dirPath);
  } catch (e) {}

  return { fileCount, dirCount, totalSize };
}

function registerIpcHandlers() {
  ipcMain.handle('config:loadGlobal', async () => {
    try {
      const configPath = getGlobalConfigPath();
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8');
        const loaded = JSON.parse(data);
        const merged = { ...DEFAULT_GLOBAL_CONFIG };
        for (const key of Object.keys(loaded)) {
          if (key in merged) {
            merged[key] = loaded[key];
          }
        }
        if (!loaded.backup_dirs && loaded.backup_dir) {
          merged.backup_dirs = [loaded.backup_dir];
        }
        return { success: true, config: merged };
      }
      return { success: true, config: { ...DEFAULT_GLOBAL_CONFIG } };
    } catch (e) {
      return { success: false, error: e.message, config: { ...DEFAULT_GLOBAL_CONFIG } };
    }
  });

  ipcMain.handle('config:saveGlobal', async (_event, config) => {
    try {
      const configPath = getGlobalConfigPath();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('config:loadBackup', async (_event, backupDir) => {
    try {
      const configPath = path.join(backupDir, 'config.json');
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8');
        const loaded = JSON.parse(data);
        const merged = { ...DEFAULT_BACKUP_CONFIG };
        for (const key of Object.keys(loaded)) {
          if (key in merged) {
            merged[key] = loaded[key];
          }
        }
        return { success: true, config: merged };
      }
      return { success: true, config: { ...DEFAULT_BACKUP_CONFIG } };
    } catch (e) {
      return { success: false, error: e.message, config: { ...DEFAULT_BACKUP_CONFIG } };
    }
  });

  ipcMain.handle('config:saveBackup', async (_event, { backup_dir, config }) => {
    try {
      if (!backup_dir || !fs.existsSync(backup_dir)) {
        return { success: false, error: 'Backup directory does not exist' };
      }
      const configPath = path.join(backup_dir, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('config:checkOld', async () => {
    try {
      const oldPath = getOldConfigPath();
      if (fs.existsSync(oldPath)) {
        const data = fs.readFileSync(oldPath, 'utf-8');
        const config = JSON.parse(data);
        return { success: true, config };
      }
      return { success: true, config: null };
    } catch (e) {
      return { success: false, error: e.message, config: null };
    }
  });

  ipcMain.handle('dialog:selectSource', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '选择要备份的文件',
        properties: ['openFile']
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return { path: result.filePaths[0], isDirectory: false };
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('dialog:selectSourceDir', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '选择要备份的文件夹',
        properties: ['openDirectory']
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return { path: result.filePaths[0], isDirectory: true };
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('dialog:selectBackupDir', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: '选择备份目录',
        properties: ['openDirectory']
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('backup:perform', async (_event, { sourcePath, backupDir, isDirectory }) => {
    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = generateTimestamp();
      const sourceName = path.basename(sourcePath);
      const backupPath = path.join(backupDir, `${sourceName}_${timestamp}`);

      if (isDirectory) {
        fs.cpSync(sourcePath, backupPath, { recursive: true });
      } else {
        fs.copyFileSync(sourcePath, backupPath);
      }

      const backupInfo = {
        timestamp,
        original: sourcePath,
        backup_path: backupPath,
        is_directory: isDirectory,
        date: formatDate()
      };

      return { success: true, backupInfo };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('backup:restore', async (_event, { backupPath, originalPath, isDirectory }) => {
    try {
      if (fs.existsSync(originalPath)) {
        if (isDirectory) {
          fs.rmSync(originalPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(originalPath);
        }
      }

      if (isDirectory) {
        fs.cpSync(backupPath, originalPath, { recursive: true });
      } else {
        fs.copyFileSync(backupPath, originalPath);
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('backup:delete', async (_event, { backupPath, isDirectory }) => {
    try {
      if (fs.existsSync(backupPath)) {
        if (isDirectory) {
          fs.rmSync(backupPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(backupPath);
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('dir:getStats', async (_event, dirPath) => {
    try {
      const stats = {
        created_time: "",
        modified_time: "",
        size: "0 B",
        backup_count: 0,
        log_count: 0,
        file_count: 0,
        dir_count: 0
      };

      if (fs.existsSync(dirPath)) {
        const dirStat = fs.statSync(dirPath);
        stats.created_time = new Date(dirStat.birthtime).toLocaleString('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(/\//g, '-');
        stats.modified_time = new Date(dirStat.mtime).toLocaleString('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(/\//g, '-');

        const { fileCount, dirCount, totalSize } = countDirRecursive(dirPath);
        stats.size = formatSize(totalSize);
        stats.file_count = fileCount;
        stats.dir_count = dirCount;

        const configPath = path.join(dirPath, 'config.json');
        if (fs.existsSync(configPath)) {
          const data = fs.readFileSync(configPath, 'utf-8');
          const configData = JSON.parse(data);
          if (configData.backups) {
            stats.backup_count = configData.backups.length;
          }
          if (configData.logs) {
            stats.log_count = configData.logs.length;
          }
        }
      }

      return { success: true, stats };
    } catch (e) {
      return { success: false, error: e.message, stats: null };
    }
  });

  ipcMain.handle('dir:listContents', async (_event, dirPath) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const contents = entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory()
      }));
      return { success: true, contents };
    } catch (e) {
      return { success: false, error: e.message, contents: [] };
    }
  });

  ipcMain.handle('file:readPreview', async (_event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        return null;
      }
      const buffer = Buffer.alloc(2000);
      const fd = fs.openSync(filePath, 'r');
      const bytesRead = fs.readSync(fd, buffer, 0, 2000, 0);
      fs.closeSync(fd);

      const content = buffer.toString('utf-8', 0, bytesRead);
      const nullIndex = content.indexOf('\x00');
      if (nullIndex !== -1 && nullIndex < 100) {
        return null;
      }
      return content;
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('timer:start', async (_event, { intervalMinutes, sourcePath, backupDir, isDirectory }) => {
    try {
      if (autoBackupIntervalId !== null) {
        clearInterval(autoBackupIntervalId);
        autoBackupIntervalId = null;
      }

      const intervalMs = intervalMinutes * 60 * 1000;

      autoBackupIntervalId = setInterval(() => {
        try {
          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
          }

          const timestamp = generateTimestamp();
          const sourceName = path.basename(sourcePath);
          const backupPath = path.join(backupDir, `${sourceName}_${timestamp}`);

          if (isDirectory) {
            fs.cpSync(sourcePath, backupPath, { recursive: true });
          } else {
            fs.copyFileSync(sourcePath, backupPath);
          }

          const backupInfo = {
            timestamp,
            original: sourcePath,
            backup_path: backupPath,
            is_directory: isDirectory,
            date: formatDate()
          };

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('backup:auto-done', backupInfo);
          }
        } catch (e) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('backup:auto-done', { error: e.message });
          }
        }
      }, intervalMs);

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('timer:stop', async () => {
    try {
      if (autoBackupIntervalId !== null) {
        clearInterval(autoBackupIntervalId);
        autoBackupIntervalId = null;
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('app:getVersion', async () => {
    return "v1.0.0";
  });

  ipcMain.handle('app:getAnnouncements', async () => {
    return ANNOUNCEMENTS;
  });
}

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (autoBackupIntervalId !== null) {
    clearInterval(autoBackupIntervalId);
    autoBackupIntervalId = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
