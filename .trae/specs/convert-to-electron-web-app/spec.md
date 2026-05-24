# ASBT Electron + Web 桌面应用转换规格

## Why
当前 ASBT（自动存档备份工具）使用 Python + tkinter 实现，界面风格受限且跨平台打包体积大。将其转换为 Electron + Web 技术栈，可以获得更现代化的 UI 体验、更灵活的界面定制能力，同时保持完全本地离线运行的模式。

## What Changes
- 将 Python tkinter 应用整体转换为 Electron + Web（HTML/CSS/JavaScript）桌面应用
- 使用 Electron 主进程处理文件系统操作（备份、还原、删除、配置读写等）
- 使用 Electron 渲染进程 + Web 技术构建现代化 UI 界面
- 通过 IPC 机制实现主进程与渲染进程的通信
- 应用完全本地离线运行，不依赖任何网络连接
- **BREAKING**: 不再支持 Python 运行方式，应用以 Electron 桌面程序形式分发

## Impact
- Affected specs: 全部功能模块（备份核心、配置管理、日志系统、公告系统、UI 层）
- Affected code: `autoSaveBackupTool.py` 将被全新的 Electron 项目结构替代
- 配置文件格式保持 JSON 不变，确保与旧版本配置的兼容性

## ADDED Requirements

### Requirement: Electron 项目结构
系统 SHALL 使用 Electron 框架构建桌面应用，项目结构包含：
- `main.js`：Electron 主进程入口，负责窗口管理、文件系统操作、IPC 处理
- `preload.js`：预加载脚本，安全地暴露 IPC API 给渲染进程
- `src/renderer/`：渲染进程代码（HTML/CSS/JS）
- `package.json`：项目配置与依赖声明

#### Scenario: 应用启动
- **WHEN** 用户启动应用
- **THEN** Electron 主进程创建主窗口，加载渲染进程页面，窗口居中显示，标题为 "ASBT · 自动存档备份工具 v1.0.0 | by@Yanxiao"

### Requirement: IPC 通信机制
系统 SHALL 通过 contextBridge + ipcRenderer/ipcMain 实现安全的进程间通信，渲染进程通过预定义的 API 调用主进程的文件系统操作。

#### Scenario: 渲染进程请求文件操作
- **WHEN** 渲染进程需要执行文件操作（如选择文件、执行备份等）
- **THEN** 通过 preload.js 暴露的 API 发送 IPC 消息到主进程，主进程执行操作后返回结果

### Requirement: 现代化 Web UI
系统 SHALL 使用 HTML + CSS + JavaScript 构建现代化 UI，功能布局与原 tkinter 版本一致，包含：
- 公告滚动栏 + 查看公告按钮
- 存档文件设置区（源文件/文件夹选择、备份目录选择、历史备份目录）
- 备份设置区（备份间隔、立即备份、开始/停止自动备份）
- 备份历史列表（支持右键菜单：还原、删除、删除备份文件夹）
- 日志查看按钮
- 状态栏

#### Scenario: UI 加载完成
- **WHEN** 应用启动并加载渲染进程页面
- **THEN** 显示完整的操作界面，所有控件可交互，公告栏显示最新公告

### Requirement: 文件系统操作（主进程）
系统 SHALL 在 Electron 主进程中实现以下文件系统操作：
- 选择文件/文件夹对话框
- 选择备份目录对话框
- 执行文件/文件夹备份（copy2/copytree）
- 执行文件/文件夹还原
- 执行文件/文件夹删除
- 读取/写入配置文件（JSON）
- 获取目录统计信息
- 读取文件内容预览
- 列出目录内容

#### Scenario: 执行备份
- **WHEN** 用户触发备份操作
- **THEN** 主进程将源文件/文件夹复制到备份目录，生成带毫秒级时间戳的文件名，记录备份信息到配置文件，添加日志记录，通知渲染进程更新 UI

### Requirement: 自动备份定时器
系统 SHALL 在主进程中实现自动备份定时器，使用 Node.js 的 setInterval 机制，支持启动/停止控制。

#### Scenario: 启动自动备份
- **WHEN** 用户点击"开始自动备份"按钮
- **THEN** 主进程启动定时器，按设定间隔（分钟）自动执行备份，渲染进程按钮文字变为"停止自动备份"

#### Scenario: 停止自动备份
- **WHEN** 用户点击"停止自动备份"按钮
- **THEN** 主进程清除定时器，停止自动备份，渲染进程按钮文字恢复为"开始自动备份"

### Requirement: 配置文件兼容性
系统 SHALL 保持与 Python 版本相同的配置文件格式和存储位置：
- 全局配置：`~/autoSaveBackupTool_config.json`
- 备份目录配置：`<备份目录>/config.json`
- 支持旧版本配置迁移（`~/.game_backup_tool/config.json`）

#### Scenario: 加载已有配置
- **WHEN** 应用启动时检测到已有的配置文件
- **THEN** 自动加载配置并恢复之前的设置状态

#### Scenario: 旧版本配置迁移
- **WHEN** 应用启动时检测到旧版本配置文件（`.game_backup_tool/config.json`）
- **THEN** 弹出迁移对话框，允许用户选择使用旧配置或当前配置，可选择迁移历史记录和日志，可选择删除旧配置文件

### Requirement: 日志系统
系统 SHALL 实现与原版功能一致的日志系统：
- 记录备份、还原、删除、恢复删除、回溯等操作
- 日志窗口支持右键菜单（查看状态、回溯操作）
- 回溯删除操作可恢复被删除的备份
- 回溯备份/还原操作可将文件恢复到该操作时的状态

#### Scenario: 查看日志状态
- **WHEN** 用户在日志列表中右键选择"状态"
- **THEN** 显示该日志记录对应的文件信息，包括操作类型、时间、路径，以及文件内容预览或目录内容列表

### Requirement: 历史备份目录管理
系统 SHALL 实现历史备份目录列表管理功能：
- 显示所有历史备份目录
- 支持选择切换备份目录
- 右键菜单支持查看状态、从历史中删除、删除备份文件夹
- 自动过滤不存在的目录

#### Scenario: 切换备份目录
- **WHEN** 用户从历史备份目录列表中选择一个目录
- **THEN** 保存当前备份配置，切换到新目录，加载新目录的配置，更新备份列表

### Requirement: 完全离线运行
系统 SHALL 在无网络连接的环境下正常运行，不依赖任何在线资源或 CDN。所有前端资源（HTML/CSS/JS/字体/图标）均打包在应用内部。

#### Scenario: 断网环境运行
- **WHEN** 用户在无网络环境下启动应用
- **THEN** 应用正常启动并运行，所有功能可用

## MODIFIED Requirements

### Requirement: 应用版本号
应用版本号从 v0.6.2 升级为 v1.0.0，标志着从 Python tkinter 到 Electron Web 的重大架构转换。

## REMOVED Requirements

### Requirement: Python 运行时依赖
**Reason**: 不再使用 Python 运行时，改用 Electron + Node.js
**Migration**: 用户需安装 Electron 版本替代 Python 版本，配置文件格式保持兼容
