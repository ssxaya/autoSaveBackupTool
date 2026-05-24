# Tasks

- [x] Task 1: 初始化 Electron 项目结构
  - [x] SubTask 1.1: 创建 package.json，声明 Electron 依赖和启动脚本
  - [x] SubTask 1.2: 创建 main.js 主进程入口，实现窗口创建、居中显示、加载渲染页面
  - [x] SubTask 1.3: 创建 preload.js，通过 contextBridge 暴露 IPC API
  - [x] SubTask 1.4: 创建 src/renderer/index.html 基础页面结构

- [x] Task 2: 实现主进程核心文件操作模块
  - [x] SubTask 2.1: 实现配置文件读写（全局配置 + 备份目录配置），保持与 Python 版本相同的 JSON 格式和存储路径
  - [x] SubTask 2.2: 实现旧版本配置检测与迁移对话框逻辑
  - [x] SubTask 2.3: 实现文件/文件夹备份操作（copyFile/copydir）
  - [x] SubTask 2.4: 实现文件/文件夹还原操作
  - [x] SubTask 2.5: 实现文件/文件夹删除操作
  - [x] SubTask 2.6: 实现目录统计信息获取（大小、文件数、备份数、日志数等）
  - [x] SubTask 2.7: 实现文件内容预览和目录内容列表读取
  - [x] SubTask 2.8: 实现自动备份定时器（setInterval）

- [x] Task 3: 实现 IPC 通信层
  - [x] SubTask 3.1: 定义 IPC 通道名称和消息格式（渲染进程 → 主进程的请求，主进程 → 渲染进程的响应/通知）
  - [x] SubTask 3.2: 在 preload.js 中暴露完整的 API 接口（selectSource, selectBackupDir, performBackup, restoreBackup, deleteBackup, getConfig, saveConfig, getDirectoryStats, getFilePreview, 等）
  - [x] SubTask 3.3: 在 main.js 中注册所有 IPC handler

- [x] Task 4: 实现渲染进程 UI - 主界面布局
  - [x] SubTask 4.1: 实现公告滚动栏 + 查看公告按钮
  - [x] SubTask 4.2: 实现存档文件设置区（源文件/文件夹选择输入框 + 按钮、备份目录选择 + 浏览 + 历史备份目录按钮）
  - [x] SubTask 4.3: 实现备份设置区（备份间隔 Spinbox、立即备份按钮、开始/停止自动备份按钮）
  - [x] SubTask 4.4: 实现备份历史列表（表格视图，列：时间、文件名，支持右键菜单）
  - [x] SubTask 4.5: 实现状态栏和日志查看按钮

- [x] Task 5: 实现渲染进程 UI - 弹窗与对话框
  - [x] SubTask 5.1: 实现历史备份目录列表弹窗（列表 + 右键菜单：状态、从历史中删除、删除备份文件夹）
  - [x] SubTask 5.2: 实现删除备份文件夹确认对话框（可选：删除配置文件、删除所有备份文件）
  - [x] SubTask 5.3: 实现公告查看弹窗
  - [x] SubTask 5.4: 实现日志查看弹窗（日志列表 + 右键菜单：状态、回溯）
  - [x] SubTask 5.5: 实现文件状态信息弹窗（操作类型、时间、路径、文件内容预览/目录内容）
  - [x] SubTask 5.6: 实现目录状态信息弹窗（路径、创建/修改时间、大小、备份数量等）
  - [x] SubTask 5.7: 实现旧版本配置迁移弹窗

- [x] Task 6: 实现渲染进程业务逻辑
  - [x] SubTask 6.1: 实现配置加载与保存逻辑（启动时加载配置，操作后保存配置）
  - [x] SubTask 6.2: 实现备份列表更新逻辑
  - [x] SubTask 6.3: 实现自动备份启动/停止控制逻辑
  - [x] SubTask 6.4: 实现备份目录切换逻辑（保存当前配置、加载新目录配置）
  - [x] SubTask 6.5: 实现日志记录与回溯逻辑
  - [x] SubTask 6.6: 实现右键菜单交互逻辑（备份列表、日志列表、历史目录列表）

- [x] Task 7: 样式美化与离线资源
  - [x] SubTask 7.1: 编写 CSS 样式，实现现代化 UI 外观
  - [x] SubTask 7.2: 确保所有前端资源内嵌，不依赖 CDN 或在线资源（字体使用系统字体或内嵌字体文件）

- [x] Task 8: 验证与测试
  - [x] SubTask 8.1: 启动应用验证所有功能正常运行
  - [x] SubTask 8.2: 验证配置文件与 Python 版本的兼容性
  - [x] SubTask 8.3: 验证离线环境下应用可正常运行

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 4]
- [Task 6] depends on [Task 4]
- [Task 7] depends on [Task 4]
- [Task 8] depends on [Task 5, Task 6, Task 7]
