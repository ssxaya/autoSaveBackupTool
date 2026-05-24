# ASBT - 自动存档备份工具 (Electron 版本)

这是一个基于 Electron 打包的桌面应用程序，可以将之前的 Web 应用打包成独立的 exe 文件，无需联网即可使用。

## 功能特性

- 📁 支持单个文件或整个文件夹的备份
- ⏰ 定时自动备份功能
- 📋 备份历史记录管理
- 🔄 备份还原和删除功能
- 📝 详细的操作日志
- 💾 本地存储配置和备份数据
- 🌐 无需联网，完全本地运行

## 开发和使用

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

这将启动 Vite 开发服务器和 Electron 应用。

### 构建生产版本

```bash
npm run build
```

这将构建前端代码和 Electron 主进程代码。

### 预览生产构建

```bash
npm run electron:preview
```

这将先构建项目，然后在 Electron 中预览。

### 打包成 exe 文件

```bash
npm run electron:dist
```

这将使用 electron-builder 将应用打包成可执行文件。

打包后的文件将保存在 `release` 目录中：

- Windows: `.exe` 安装程序和便携版
- macOS: `.dmg` 文件
- Linux: `.AppImage` 文件

## 项目结构

```
/workspace/
├── electron/              # Electron 相关代码
│   ├── main.ts           # 主进程
│   └── preload.ts        # 预加载脚本
├── src/                  # React 前端代码
│   ├── components/       # 组件
│   ├── pages/            # 页面
│   ├── store/            # 状态管理
│   └── utils/            # 工具函数
├── api/                  # Express 后端 API
│   ├── routes/           # API 路由
│   └── services/         # 业务逻辑
├── shared/               # 共享类型定义
├── dist/                 # 前端构建输出
├── dist-electron/        # Electron 主进程构建输出
└── release/              # 打包输出
```

## 配置

### electron-builder 配置

在 `package.json` 中的 `build` 字段可以自定义打包配置：

```json
{
  "build": {
    "appId": "com.asbt.backup-tool",
    "productName": "ASBT - 自动存档备份工具",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": ["nsis", "portable"]
    }
  }
}
```

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **状态管理**: Zustand
- **后端**: Express + TypeScript
- **桌面框架**: Electron + electron-builder
- **图标**: Lucide React

## 注意事项

1. 应用需要文件系统读写权限
2. 备份文件会保存在用户指定的目录中
3. 配置文件保存在用户目录下
4. 不需要联网，完全本地运行

## 常见问题

### 如何更改应用图标？

将你的图标文件放在 `public/` 目录下，然后在 `package.json` 的 `build.win.icon` 字段中指定路径。

### 打包失败怎么办？

确保：
1. 所有依赖已正确安装
2. TypeScript 检查通过 (`npm run check`)
3. 有足够的磁盘空间

### 应用无法启动？

检查是否有防火墙或杀毒软件阻止了应用运行，或者尝试以管理员身份运行。

