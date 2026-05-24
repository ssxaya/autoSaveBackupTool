import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import express from 'express';
import cors from 'cors';
import configRoutes from './api/routes/config';
import fileRoutes from './api/routes/files';

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

// 启动本地 Express 服务器
function startServer() {
  const expressApp = express();
  const PORT = 3001;

  expressApp.use(cors());
  expressApp.use(express.json({ limit: '10mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API 路由
  expressApp.use('/api/config', configRoutes);
  expressApp.use('/api/files', fileRoutes);

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

