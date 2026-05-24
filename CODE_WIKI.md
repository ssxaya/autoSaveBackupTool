# AutoSaveBackupTool (ASBT) - Code Wiki

## 目录

1. [项目概述](#项目概述)
2. [项目架构](#项目架构)
3. [目录结构](#目录结构)
4. [依赖关系](#依赖关系)
5. [核心模块说明](#核心模块说明)
6. [关键类与函数详解](#关键类与函数详解)
7. [配置系统](#配置系统)
8. [数据流程](#数据流程)
9. [项目运行方式](#项目运行方式)
10. [扩展与维护指南](#扩展与维护指南)

---

## 项目概述

**AutoSaveBackupTool (ASBT)** 是一款用于自动备份游戏存档或其他重要文件的Python桌面应用程序。该工具支持定时自动备份、手动备份、备份历史管理、日志记录与回溯等功能。

- **当前版本**: v0.6.2
- **开发语言**: Python 3
- **GUI框架**: tkinter
- **作者**: Yanxiao (ssxaya)

### 核心功能

| 功能 | 描述 |
|------|------|
| 文件/文件夹备份 | 支持单个文件或整个文件夹的备份 |
| 定时自动备份 | 可设置备份间隔，自动执行备份任务 |
| 手动备份 | 一键执行即时备份 |
| 备份历史管理 | 查看、还原、删除备份记录 |
| 日志系统 | 记录所有操作，支持回溯功能 |
| 配置持久化 | 自动保存用户设置和备份记录 |

---

## 项目架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    AutoSaveBackupTool                        │
│                      (主应用程序类)                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   UI 层     │  │  业务逻辑层  │  │     数据持久层       │  │
│  │  (tkinter)  │  │             │  │                     │  │
│  ├─────────────┤  ├─────────────┤  ├─────────────────────┤  │
│  │ - 主窗口    │  │ - 备份管理  │  │ - 全局配置文件       │  │
│  │ - 公告栏    │  │ - 还原管理  │  │ - 备份目录配置文件   │  │
│  │ - 设置面板  │  │ - 日志管理  │  │ - 旧版本配置迁移     │  │
│  │ - 备份列表  │  │ - 目录管理  │  │                     │  │
│  │ - 日志窗口  │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      文件系统操作层                           │
│              (shutil, os, threading, json)                  │
└─────────────────────────────────────────────────────────────┘
```

### 设计模式

项目采用**单类架构**设计，所有功能集中在 `AutoSaveBackupTool` 类中，通过方法分组实现模块化：

- **UI创建方法组**: 负责界面构建
- **备份操作方法组**: 核心业务逻辑
- **配置管理方法组**: 数据持久化
- **日志管理方法组**: 操作记录与回溯

---

## 目录结构

```
autoSaveBackupTool/
│
├── autoSaveBackupTool.py      # 主程序文件（单文件应用）
├── README.md                   # 项目说明文档
├── CODE_WIKI.md               # 本Wiki文档
│
├── .idea/                     # PyCharm/IntelliJ IDE配置
│   ├── .gitignore
│   ├── autoSaveBackupTool.iml
│   ├── misc.xml
│   ├── modules.xml
│   ├── vcs.xml
│   └── inspectionProfiles/
│       └── profiles_settings.xml
│
└── output/                    # 编译输出目录
    └── autoSaveBackupTool.exe # Windows可执行文件
```

### 运行时生成的文件

| 文件路径 | 说明 |
|---------|------|
| `~/autoSaveBackupTool_config.json` | 全局配置文件（用户设置） |
| `~/.game_backup_tool/config.json` | 旧版本配置文件（兼容） |
| `<backup_dir>/config.json` | 备份目录特定的配置文件 |

---

## 依赖关系

### Python标准库依赖

```python
import os           # 文件系统操作
import shutil       # 高级文件操作（复制、删除目录等）
import tkinter      # GUI框架
from tkinter import filedialog, messagebox, ttk  # GUI组件
from datetime import datetime  # 日期时间处理
import json         # JSON配置文件读写
import time         # 时间控制
import threading    # 多线程支持
import copy         # 深拷贝
```

### 依赖说明

| 模块 | 用途 | 是否必需 |
|------|------|---------|
| `os` | 路径处理、文件存在检查 | 必需 |
| `shutil` | 文件/目录复制、删除 | 必需 |
| `tkinter` | GUI界面 | 必需 |
| `datetime` | 时间戳生成 | 必需 |
| `json` | 配置文件读写 | 必需 |
| `threading` | 自动备份后台线程 | 必需 |
| `copy` | 配置深拷贝 | 必需 |

### 外部依赖

**无第三方依赖**，项目完全基于Python标准库构建，无需安装额外包。

---

## 核心模块说明

### 模块划分

由于项目采用单文件架构，通过方法分组实现模块化：

#### 1. UI模块 (界面构建)

| 方法 | 功能 |
|------|------|
| `create_widgets()` | 创建主界面所有组件 |
| `create_scrolling_text()` | 创建滚动公告文本 |
| `center_window()` | 窗口居中显示 |
| `show_announcements()` | 显示公告窗口 |
| `show_backup_dirs_list()` | 显示历史备份目录列表 |
| `show_logs()` | 显示日志窗口 |
| `show_file_info()` | 显示文件详细信息 |
| `show_directory_info()` | 显示目录统计信息 |
| `show_context_menu()` | 显示右键菜单 |
| `show_log_context_menu()` | 显示日志右键菜单 |

#### 2. 备份模块 (核心业务)

| 方法 | 功能 |
|------|------|
| `perform_backup()` | 执行备份操作 |
| `manual_backup()` | 手动备份入口 |
| `auto_backup_task()` | 自动备份线程任务 |
| `toggle_auto_backup()` | 切换自动备份状态 |
| `restore_backup()` | 还原备份 |
| `delete_backup()` | 删除备份 |
| `delete_backup_folder()` | 删除备份文件夹 |
| `update_backup_list()` | 更新备份列表显示 |

#### 3. 配置模块 (数据持久化)

| 方法 | 功能 |
|------|------|
| `load_global_config()` | 加载全局配置 |
| `save_global_config()` | 保存全局配置 |
| `load_backup_config()` | 加载备份目录配置 |
| `save_backup_config()` | 保存备份目录配置 |
| `load_config()` | 兼容方法：加载所有配置 |
| `save_config()` | 兼容方法：保存所有配置 |
| `check_old_config()` | 检查并迁移旧版本配置 |
| `switch_backup_dir()` | 切换备份目录 |

#### 4. 日志模块 (操作记录)

| 方法 | 功能 |
|------|------|
| `add_log()` | 添加日志记录 |
| `view_file_status_from_log()` | 查看日志文件状态 |
| `rollback_log_action()` | 回溯日志操作 |
| `rollback_delete_action()` | 回溯删除操作 |
| `rollback_to_file_state()` | 回溯到指定文件状态 |
| `refresh_log_display_if_open()` | 刷新日志显示 |

#### 5. 工具模块 (辅助功能)

| 方法 | 功能 |
|------|------|
| `validate_settings()` | 验证用户设置 |
| `select_source()` | 选择源文件/文件夹 |
| `select_backup_dir()` | 选择备份目录 |
| `update_announcement_display()` | 更新公告显示 |
| `get_directory_stats()` | 获取目录统计信息 |
| `format_size()` | 格式化文件大小 |
| `show_delete_folder_dialog()` | 显示删除确认对话框 |

---

## 关键类与函数详解

### 主类: AutoSaveBackupTool

```python
class AutoSaveBackupTool:
    """
    自动存档备份工具主类
    
    职责:
    - 管理应用程序生命周期
    - 协调UI与业务逻辑
    - 处理用户交互
    - 管理配置与日志
    """
```

#### 类常量

```python
VERSION = "v0.6.2"  # 版本号

ANNOUNCEMENTS = [...]  # 公告列表，存储在源代码中
```

#### 实例属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `root` | `tk.Tk` | 主窗口对象 |
| `global_config` | `dict` | 全局配置（用户设置） |
| `backup_config` | `dict` | 备份目录配置 |
| `config` | `dict` | 合并配置（兼容用） |
| `global_config_file` | `str` | 全局配置文件路径 |
| `backup_config_file` | `str` | 备份配置文件路径 |
| `old_config_file` | `str` | 旧版本配置文件路径 |
| `backup_thread` | `threading.Thread` | 自动备份线程 |
| `is_running` | `bool` | 自动备份运行状态 |

#### 核心方法详解

##### `__init__(self, root)`

初始化应用程序，执行以下步骤：
1. 设置窗口属性
2. 初始化配置结构
3. 检查旧版本配置
4. 加载全局配置
5. 创建UI界面
6. 加载备份目录配置
7. 更新备份列表

```python
def __init__(self, root):
    self.root = root
    self.root.title(f"ASBT · 自动存档备份工具 {self.VERSION} | by@Yanxiao")
    self.root.geometry("700x620")
    self.center_window(self.root)
    
    self.global_config = {
        "source_path": "",
        "is_directory": False,
        "backup_dir": "",
        "backup_dirs": [],
        "interval": 5,
    }
    
    self.backup_config = {
        "backups": [],
        "logs": []
    }
    
    self.config = {**self.global_config, **self.backup_config}
    # ... 后续初始化
```

##### `perform_backup(self)`

执行备份操作的核心方法：

```python
def perform_backup(self):
    """
    执行备份操作
    
    流程:
    1. 获取源路径和备份目录
    2. 生成带毫秒时间戳的备份文件名
    3. 根据类型（文件/目录）执行复制
    4. 记录备份信息
    5. 添加日志
    6. 保存配置
    7. 更新UI
    """
```

**时间戳格式**: `%Y%m%d_%H%M%S_%f` (精确到毫秒)

##### `auto_backup_task(self)`

自动备份线程任务：

```python
def auto_backup_task(self):
    """
    自动备份后台任务
    
    特点:
    - 运行在独立线程中
    - 每秒检查停止标志
    - 支持优雅停止
    - 异常时自动停止并更新UI
    """
    while self.is_running:
        try:
            self.perform_backup()
            interval_seconds = self.global_config["interval"] * 60
            for _ in range(interval_seconds):
                if not self.is_running:
                    break
                time.sleep(1)
        except Exception as e:
            self.status_var.set(f"自动备份出错: {str(e)}")
            self.is_running = False
            self.root.after(0, lambda: self.start_auto_btn.config(text="开始自动备份"))
            break
```

##### `rollback_log_action(self)`

日志回溯核心方法：

```python
def rollback_log_action(self):
    """
    根据日志类型执行不同的回溯操作
    
    - delete: 恢复被删除的备份
    - backup/restore: 恢复到该操作时的文件状态
    """
```

---

## 配置系统

### 配置文件架构

项目采用**双配置文件**架构：

```
┌─────────────────────────────────────────────────────────┐
│                    配置系统架构                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐     │
│  │   全局配置文件       │    │  备份目录配置文件    │     │
│  │ (用户主目录下)       │    │ (备份目录下)        │     │
│  └─────────────────────┘    └─────────────────────┘     │
│           │                          │                   │
│           ▼                          ▼                   │
│  ┌─────────────────────┐    ┌─────────────────────┐     │
│  │ - source_path       │    │ - backups[]         │     │
│  │ - is_directory      │    │ - logs[]            │     │
│  │ - backup_dir        │    │                     │     │
│  │ - backup_dirs[]     │    │                     │     │
│  │ - interval          │    │                     │     │
│  └─────────────────────┘    └─────────────────────┘     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 全局配置结构

```json
{
  "source_path": "D:/Games/SaveGame",
  "is_directory": true,
  "backup_dir": "D:/Backups",
  "backup_dirs": [
    "D:/Backups",
    "E:/GameBackups"
  ],
  "interval": 5
}
```

### 备份目录配置结构

```json
{
  "backups": [
    {
      "timestamp": "20250508_143025_123",
      "original": "D:/Games/SaveGame",
      "backup_path": "D:/Backups/SaveGame_20250508_143025_123",
      "is_directory": true,
      "date": "2025-05-08 14:30:25"
    }
  ],
  "logs": [
    {
      "timestamp": "20250508_143025_123",
      "date": "2025-05-08 14:30:25",
      "action": "backup",
      "backup_info": { ... }
    }
  ]
}
```

### 配置迁移机制

项目支持从旧版本配置迁移：

```python
def check_old_config(self):
    """
    检查旧版本配置文件 (~/.game_backup_tool/config.json)
    
    迁移选项:
    - 使用旧版本配置 / 使用当前配置
    - 迁移历史记录和日志到备份目录
    - 删除旧版本配置文件
    """
```

---

## 数据流程

### 备份流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   用户触发    │────▶│  验证设置    │────▶│  执行备份    │
│  (手动/自动)  │     │ validate_    │     │ perform_     │
└──────────────┘     │ settings()   │     │ backup()     │
                     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   更新UI     │◀────│  保存配置    │◀────│  记录日志    │
│ update_      │     │ save_        │     │ add_log()    │
│ backup_list()│     │ config()     │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 还原流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  选择备份    │────▶│  确认还原    │────▶│  先备份当前  │
│  (右键菜单)  │     │  (对话框)    │     │ perform_     │
└──────────────┘     └──────────────┘     │ backup()     │
                                          └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   更新UI     │◀────│  记录日志    │◀────│  复制备份    │
│ status_var   │     │ add_log()    │     │ 到原位置     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 日志回溯流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  选择日志    │────▶│  判断类型    │────▶│ delete类型   │
│  (右键菜单)  │     │              │     │ 恢复删除     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ backup/      │
                     │ restore类型  │
                     │ 恢复文件状态 │
                     └──────────────┘
```

---

## 项目运行方式

### 开发环境运行

```bash
# 确保Python 3已安装
python --version

# 直接运行主程序
python autoSaveBackupTool.py
```

### 打包为可执行文件

使用 PyInstaller 打包：

```bash
# 安装PyInstaller
pip install pyinstaller

# 打包为单个可执行文件
pyinstaller --onefile --windowed --name autoSaveBackupTool autoSaveBackupTool.py

# 输出位置
# dist/autoSaveBackupTool.exe
```

### 系统要求

| 项目 | 要求 |
|------|------|
| Python版本 | 3.6+ |
| 操作系统 | Windows / macOS / Linux |
| GUI环境 | 需要图形界面支持 |

### 运行参数

无命令行参数，程序启动后直接显示GUI界面。

---

## 扩展与维护指南

### 添加新功能

1. **添加新的备份类型**:
   - 修改 `perform_backup()` 方法
   - 更新 `backup_config` 结构

2. **添加新的UI组件**:
   - 在 `create_widgets()` 中添加
   - 遵循现有的ttk组件风格

3. **添加新的日志操作类型**:
   - 在 `add_log()` 中添加新类型
   - 更新 `action_map` 字典
   - 在 `rollback_log_action()` 中处理

### 代码风格

- 使用中文注释和文档字符串
- 方法名使用下划线命名法
- 类名使用驼峰命名法
- 保持单文件架构

### 版本更新流程

1. 更新 `VERSION` 常量
2. 在 `ANNOUNCEMENTS` 中添加更新公告
3. 更新 `README.md` 中的版本历史
4. 测试配置迁移兼容性

### 调试建议

```python
# 启用详细错误输出
import traceback
try:
    # 代码块
except Exception as e:
    traceback.print_exc()
    messagebox.showerror("错误", f"详细信息: {str(e)}")
```

---

## 附录

### 文件命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 备份文件 | `{原名}_{时间戳}` | `SaveGame_20250508_143025_123` |
| 时间戳 | `%Y%m%d_%H%M%S_%f` | `20250508_143025_123` |
| 配置文件 | `config.json` | - |

### 状态码与消息

| 操作 | 状态消息 |
|------|---------|
| 备份完成 | `备份完成: {文件名} 于 {时间}` |
| 还原完成 | `已还原: {文件名}` |
| 删除完成 | `备份已删除` |
| 自动备份启动 | `自动备份已启动` |
| 自动备份停止 | `自动备份已停止` |

### 常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 备份失败 | 源文件不存在 | 检查路径有效性 |
| 配置丢失 | 配置文件损坏 | 删除配置文件重新生成 |
| 界面无响应 | 长时间备份阻塞UI | 使用自动备份（后台线程） |
| 还原失败 | 备份文件已删除 | 通过日志回溯恢复 |

---

**文档版本**: 1.0  
**最后更新**: 2025-05-24  
**适用版本**: ASBT v0.6.2
