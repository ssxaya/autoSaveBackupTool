# ASBT - 自动存档备份工具 (Electron 版本)

基于 Web 技术（React + Electron + Python）的本地桌面应用，用于自动备份文件或文件夹。

## ✨ 功能特性

- ✅ 单文件或文件夹备份
- ✅ 定时自动备份
- ✅ 手动备份
- ✅ 备份历史记录
- ✅ 备份还原与删除
- ✅ 详细日志记录
- ✅ 公告系统
- ✅ 前后端分离架构（便于 UI 定制）

## 🚀 快速开始

### 安装

**Windows**: 双击 `install.bat`
**Linux/macOS**: 运行 `./install.sh`

或手动安装：

```bash
cd electron-app
npm install
```

### 开发运行

```bash
# 开发模式
npm run electron:dev

# 或仅前端预览（无 Electron）
npm run dev
```

### 构建打包

```bash
npm run electron:build
```

构建完成后，安装包位于 `release/` 目录。

## 📐 架构设计

### 前后端分离

```
┌──────────────────────────────────────────────┐
│           Electron 桌面应用                   │
├─────────────────┬──────────────────────────┤
│  React 前端     │  Python 后端              │
│  (纯 UI 层)     │  (核心业务逻辑)            │
├─────────────────┼──────────────────────────┤
│  components/   │  backend/core/           │
│  hooks/        │  - 备份操作               │
│  services/     │  - 文件管理               │
│                 │  - 配置管理               │
├─────────────────┴──────────────────────────┤
│           Electron IPC 通信通道             │
└──────────────────────────────────────────────┘
```

### 模块化组件

所有 UI 组件完全独立，位于 `src/renderer/components/`：

- `Announcement` - 公告栏
- `FileSettings` - 文件设置
- `BackupSettings` - 备份设置
- `BackupList` - 备份历史列表
- `LogViewer` - 日志查看器
- `StatusBar` - 状态栏

## 🎨 自定义 UI

由于前后端完全分离，您可以轻松修改界面：

### 修改样式

编辑对应的 `.css` 文件，例如：
- `src/renderer/components/Announcement.css`
- `src/renderer/components/BackupList.css`

### 修改组件

编辑对应的 `.tsx` 文件：
```tsx
export const BackupList: React.FC<Props> = ({ backups, onRestore }) => {
  // 组件逻辑
}
```

### 添加新功能

1. 在 `backend/core/backup.py` 添加业务逻辑
2. 在 `backend/server.py` 添加处理函数
3. 在 `src/renderer/services/api.ts` 添加调用
4. 在对应组件中使用

## 📁 项目结构

```
electron-app/
├── backend/               # Python 后端
│   ├── server.py         # 服务入口
│   └── core/             # 核心业务逻辑
│       └── backup.py
│
├── src/
│   ├── main/            # Electron 主进程
│   ├── preload/         # 预加载脚本
│   └── renderer/        # React 前端
│       ├── components/  # UI 组件
│       ├── hooks/       # 业务逻辑
│       └── services/    # API 调用
│
├── package.json
├── vite.config.ts
└── electron-builder.yml
```

详细项目结构请查看 `PROJECT_STRUCTURE.txt`

## 🔧 配置说明

- 全局配置: `~/autoSaveBackupTool_electron_config.json`
- 备份配置: `{备份目录}/config.json`

## 📖 详细文档

- [快速开始指南](QUICKSTART.md)
- [项目结构详解](PROJECT_STRUCTURE.txt)

## ⚠️ 注意事项

- 本应用纯本地运行，无需联网
- 配置文件保存在用户主目录
- 支持 Windows/macOS/Linux

## 📝 作者

Yanxiao(ssxaya)

## 📄 许可证

MIT License
