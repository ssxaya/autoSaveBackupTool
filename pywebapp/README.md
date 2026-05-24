# ASBT - 自动存档备份工具 (Python WebView 版本)

这是一个使用 Python + webview 框架重构的自动存档备份工具，完全本地运行，不需要联网。

## 功能特性

- ✅ 支持文件备份
- ✅ 支持文件夹备份
- ✅ 手动备份
- ✅ 自动定时备份
- ✅ 备份历史记录
- ✅ 备份还原
- ✅ 备份删除
- ✅ 日志记录
- ✅ 历史备份目录管理
- ✅ 右键菜单操作
- ✅ 完全离线运行

## 快速开始

### 方式一：使用打包脚本（推荐）

1. 双击运行 `build.bat`
2. 按照提示完成打包
3. 在 `dist` 文件夹中找到生成的 exe 文件

### 方式二：手动安装和运行

#### 1. 安装依赖

```bash
# 确保已安装 Python 3.8 或更高版本
pip install -r requirements.txt
```

#### 2. 运行应用程序

```bash
python app.py
```

#### 3. 打包为 exe

```bash
pip install pyinstaller
pyinstaller --onefile --windowed --name "ASBT-自动存档备份工具" --add-data "index.html;." --add-data "renderer.js;." app.py
```

打包后的文件将在 `dist` 目录中。

## 使用说明

1. **选择源文件/文件夹**：点击"选择文件"或"选择文件夹"按钮
2. **选择备份目录**：点击"浏览"按钮选择备份保存位置
3. **设置备份间隔**：输入自动备份的时间间隔（分钟）
4. **立即备份**：手动执行一次备份
5. **开始自动备份**：启动定时自动备份功能
6. **查看日志**：查看所有备份、还原、删除操作记录
7. **右键操作**：在备份历史列表中右键可进行还原、删除等操作

## 技术栈

- Python 3.8+ - 编程语言
- webview - 轻量级桌面应用框架
- PyInstaller - 打包工具
- HTML/CSS/JavaScript - 前端界面

## 配置文件

- 全局配置：`用户目录\autoSaveBackupTool_config.json`
- 备份配置：`备份目录\config.json`

## 注意事项

- 打包后的exe是便携版本，可以直接运行，无需安装
- 所有数据保存在本地，不会上传到任何服务器
- 建议定期备份重要文件

## 常见问题

### Q: 打包后的程序无法运行？
A: 请确保使用 Python 3.8 或更高版本，并重新安装依赖。

### Q: 如何创建桌面快捷方式？
A: 右键点击 exe 文件 → 发送到 → 桌面快捷方式

### Q: 配置文件保存在哪里？
A: 全局配置在 `C:\Users\你的用户名\autoSaveBackupTool_config.json`

## 许可证

MIT License
