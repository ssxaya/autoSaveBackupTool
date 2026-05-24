# ASBT Electron 版本 - 快速入门指南

## 🎯 项目概述

ASBT Electron 是一个基于 Web 技术（React + Electron + Python）实现的本地桌面应用，用于自动备份文件或文件夹。

## 📁 项目结构

```
electron-app/
├── src/
│   ├── main/                    # Electron 主进程
│   │   └── main.ts              # 窗口管理、IPC 通信
│   ├── preload/                  # 预加载脚本
│   │   └── preload.ts           # 安全桥梁
│   ├── renderer/                # React 前端（纯 UI）
│   │   ├── components/          # UI 组件（模块化）
│   │   │   ├── Announcement.tsx       # 公告栏
│   │   │   ├── FileSettings.tsx      # 文件设置
│   │   │   ├── BackupSettings.tsx     # 备份设置
│   │   │   ├── BackupList.tsx         # 备份列表
│   │   │   ├── LogViewer.tsx          # 日志查看
│   │   │   └── StatusBar.tsx          # 状态栏
│   │   ├── hooks/              # 业务逻辑 Hooks
│   │   │   └── useBackup.ts
│   │   └── services/          # API 调用层
│   │       └── api.ts
│   └── types/                  # TypeScript 类型
│       └── index.ts
├── backend/                    # Python 后端（核心业务逻辑）
│   ├── server.py              # 服务入口
│   └── core/                  # 核心逻辑（与 UI 分离）
│       └── backup.py
├── build/                     # 构建资源（图标等）
├── dist/                      # 构建输出
├── dist-electron/            # Electron 构建输出
└── release/                  # 打包输出
```

## 🚀 快速开始

### 1. 安装依赖

**Windows 用户**: 双击运行 `install.bat`
**macOS/Linux 用户**: 运行 `./install.sh`

或者手动安装：

```bash
# 设置镜像（国内网络环境）
export ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://cdn.npmmirror.com/binaries/electron-builder-binaries/
export npm_config_registry=https://registry.npmmirror.com

# 安装依赖
npm install
```

### 2. 开发模式

```bash
# 启动 Vite 开发服务器
npm run dev
```

### 3. 运行 Electron 应用

```bash
# 开发模式运行
npm run electron:dev
```

### 4. 构建打包

```bash
# 构建 Windows 安装包
npm run electron:build
```

构建完成后，安装包位于 `release/` 目录。

## 🎨 架构说明

### 前后端分离

```
┌─────────────────────────────────────────┐
│           Electron 桌面应用              │
├──────────────────┬──────────────────────┤
│   React 前端     │   Python 后端        │
│   (纯 UI 层)     │   (业务逻辑层)        │
├──────────────────┼──────────────────────┤
│   组件 Components │   核心 Core          │
│   Hooks          │   文件操作            │
│   Services API   │   配置管理            │
├──────────────────┴──────────────────────┤
│           IPC 通信通道                  │
└─────────────────────────────────────────┘
```

### 模块化设计

- **UI 组件**: 位于 `src/renderer/components/`，完全独立，可单独修改
- **业务逻辑**: 位于 `backend/core/`，与 UI 完全分离
- **通信层**: 位于 `src/renderer/services/api.ts`

## 📝 修改 UI

所有 UI 组件都位于 `src/renderer/components/` 目录：

### 修改样式

编辑对应的 `.css` 文件：

- `Announcement.css` - 公告栏样式
- `FileSettings.css` - 文件设置样式
- `BackupSettings.css` - 备份设置样式
- `BackupList.css` - 备份列表样式
- `StatusBar.css` - 状态栏样式

### 修改组件逻辑

编辑对应的 `.tsx` 文件，例如修改 `BackupList.tsx`：

```tsx
// src/renderer/components/BackupList.tsx
export const BackupList: React.FC<Props> = ({ backups, onRestore, onDelete }) => {
  // 组件逻辑
  // ...
}
```

### 修改后端逻辑

编辑 `backend/core/backup.py`：

```python
# backend/core/backup.py
class BackupCore:
    def perform_backup(self):
        # 备份逻辑
        # ...
```

## 🔧 配置说明

- **全局配置**: `~/autoSaveBackupTool_electron_config.json`
- **备份配置**: `{备份目录}/config.json`

## 📦 打包说明

打包后的安装包会自动包含：

- Electron 运行时
- Python 后端 (`backend/` 目录)
- React 前端 (`dist/` 目录)

用户无需安装 Python 或 Node.js，即可运行应用。

## ❓ 常见问题

### Q: 网络安装失败怎么办？

A: 使用国内镜像：
```bash
npm config set registry https://registry.npmmirror.com
export ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/
npm install
```

### Q: 如何添加新功能？

A: 
1. 在 `backend/core/` 添加业务逻辑
2. 在 `backend/server.py` 添加处理函数
3. 在 `src/renderer/services/api.ts` 添加调用
4. 在对应组件中使用

### Q: 图标在哪里配置？

A: 将图标文件放入 `build/` 目录：
- Windows: `icon.ico`
- macOS: `icon.icns`
- Linux: `icon.png`

## 📄 许可证

MIT License

## 👤 作者

Yanxiao(ssxaya)
