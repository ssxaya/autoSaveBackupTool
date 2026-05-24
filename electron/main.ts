import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import express from 'express';
import cors from 'cors';
import fs from 'fs';

// 保持对 window 对象的全局引用，避免被垃圾回收
let mainWindow: BrowserWindow | null = null;
let server: any = null;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    icon: path.join(__dirname, '../public/favicon.svg'),
    title: 'ASBT - 自动存档备份工具'
  });

  // 根据环境加载不同的内容
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 配置服务
interface GlobalConfig {
  sourcePath: string;
  isDirectory: boolean;
  backupDir: string;
  backupDirs: string[];
  interval: number;
}

interface BackupInfo {
  timestamp: string;
  original: string;
  backupPath: string;
  isDirectory: boolean;
  date: string;
}

interface LogEntry {
  timestamp: string;
  action: string;
  backupInfo: BackupInfo;
  date: string;
}

interface BackupConfig {
  backups: BackupInfo[];
  logs: LogEntry[];
}

const ANNOUNCEMENTS = [
  { content: 'v1.0 Web版本发布：全新Web界面，支持跨平台访问！', date: '2025-05-24' }
];

function getGlobalConfigPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || __dirname;
  return path.join(home, 'autoSaveBackupTool_config.json');
}

function getGlobalConfig(): GlobalConfig {
  try {
    const configPath = getGlobalConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading global config:', error);
  }
  return {
    sourcePath: '',
    isDirectory: false,
    backupDir: '',
    backupDirs: [],
    interval: 5
  };
}

function saveGlobalConfig(config: GlobalConfig): void {
  try {
    const configPath = getGlobalConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving global config:', error);
  }
}

function getBackupConfig(backupDir: string): BackupConfig {
  const configPath = path.join(backupDir, 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading backup config:', error);
  }
  return { backups: [], logs: [] };
}

function saveBackupConfig(backupDir: string, config: BackupConfig): void {
  const configPath = path.join(backupDir, 'config.json');
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving backup config:', error);
  }
}

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}_${milliseconds}`;
}

function copyFile(source: string, dest: string): void {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(source, dest);
}

function copyDirectory(source: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const files = fs.readdirSync(source);
  for (const file of files) {
    const srcPath = path.join(source, file);
    const destPath = path.join(dest, file);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function deleteFileOrDirectory(filePath: string): void {
  if (fs.existsSync(filePath)) {
    if (fs.statSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  }
}

// 启动本地 Express 服务器
function startServer() {
  const expressApp = express();
  const PORT = 3001;

  expressApp.use(cors());
  expressApp.use(express.json({ limit: '10mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 获取配置
  expressApp.get('/api/config', (req, res) => {
    try {
      const config = getGlobalConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get config' });
    }
  });

  // 保存配置
  expressApp.post('/api/config', (req, res) => {
    try {
      saveGlobalConfig(req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save config' });
    }
  });

  // 获取公告
  expressApp.get('/api/config/announcements', (req, res) => {
    res.json(ANNOUNCEMENTS);
  });

  // 列出文件
  expressApp.get('/api/files/list', (req, res) => {
    try {
      const home = process.env.HOME || process.env.USERPROFILE || '/';
      const targetPath = (req.query.path as string) || home;
      const files = fs.existsSync(targetPath) 
        ? fs.readdirSync(targetPath).map(name => ({
            name,
            path: path.join(targetPath, name),
            isDirectory: fs.statSync(path.join(targetPath, name)).isDirectory()
          }))
        : [];
      res.json({ files, currentPath: targetPath, homePath: home });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list files' });
    }
  });

  // 执行备份
  expressApp.post('/api/files/backup', (req, res) => {
    try {
      const { sourcePath, backupDir, isDirectory } = req.body;
      if (!sourcePath || !backupDir) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = getTimestamp();
      const sourceName = path.basename(sourcePath);
      const backupPath = path.join(backupDir, `${sourceName}_${timestamp}`);

      if (isDirectory) {
        copyDirectory(sourcePath, backupPath);
      } else {
        copyFile(sourcePath, backupPath);
      }

      const backupInfo: BackupInfo = {
        timestamp,
        original: sourcePath,
        backupPath,
        isDirectory,
        date: new Date().toLocaleString('zh-CN')
      };

      const backupConfig = getBackupConfig(backupDir);
      backupConfig.backups.push(backupInfo);
      backupConfig.logs.push({
        timestamp,
        action: 'backup',
        backupInfo,
        date: new Date().toLocaleString('zh-CN')
      });
      saveBackupConfig(backupDir, backupConfig);

      res.json({ success: true, backupInfo });
    } catch (error) {
      res.status(500).json({ error: 'Failed to perform backup' });
    }
  });

  // 获取备份列表
  expressApp.get('/api/files/backups', (req, res) => {
    try {
      const { backupDir } = req.query;
      if (!backupDir || typeof backupDir !== 'string') {
        return res.status(400).json({ error: 'Missing backupDir parameter' });
      }
      const backupConfig = getBackupConfig(backupDir);
      const validBackups = backupConfig.backups.filter(b => fs.existsSync(b.backupPath));
      res.json({ backups: validBackups });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get backups' });
    }
  });

  // 还原备份
  expressApp.post('/api/files/restore', (req, res) => {
    try {
      const { backupPath, originalPath, isDirectory, backupDir } = req.body;

      if (!fs.existsSync(backupPath)) {
        return res.status(400).json({ error: 'Backup file/directory not found' });
      }

      // 先备份当前状态
      if (fs.existsSync(originalPath)) {
        const timestamp = getTimestamp();
        const sourceName = path.basename(originalPath);
        const tempBackupPath = path.join(backupDir, `${sourceName}_pre_restore_${timestamp}`);
        if (isDirectory) {
          copyDirectory(originalPath, tempBackupPath);
        } else {
          copyFile(originalPath, tempBackupPath);
        }
      }

      // 删除原文件
      deleteFileOrDirectory(originalPath);

      // 还原备份
      if (isDirectory) {
        copyDirectory(backupPath, originalPath);
      } else {
        copyFile(backupPath, originalPath);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  });

  // 删除备份
  expressApp.delete('/api/files/backup', (req, res) => {
    try {
      const { backupPath, backupDir } = req.body;
      deleteFileOrDirectory(backupPath);

      const backupConfig = getBackupConfig(backupDir);
      backupConfig.backups = backupConfig.backups.filter(b => b.backupPath !== backupPath);
      saveBackupConfig(backupDir, backupConfig);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete backup' });
    }
  });

  // 获取日志
  expressApp.get('/api/files/logs', (req, res) => {
    try {
      const { backupDir } = req.query;
      if (!backupDir || typeof backupDir !== 'string') {
        return res.status(400).json({ error: 'Missing backupDir parameter' });
      }
      const backupConfig = getBackupConfig(backupDir);
      res.json({ logs: backupConfig.logs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get logs' });
    }
  });

  // 健康检查
  expressApp.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'ok' });
  });

  server = expressApp.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}`);
  });
}

// 应用准备就绪
app.whenReady().then(() => {
  // 先启动服务器
  startServer();
  // 再创建窗口
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 关闭服务器
    if (server) {
      server.close();
    }
    app.quit();
  }
});

// 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，重新创建一个窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 在应用退出前清理
app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});

