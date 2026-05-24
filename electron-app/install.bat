@echo off
REM ASBT Electron 安装脚本 (Windows)
REM 用于在网络正常的环境下安装依赖

echo 开始安装 ASBT Electron 依赖...

REM 设置 Electron 镜像（使用国内镜像）
set ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://cdn.npmmirror.com/binaries/electron-builder-binaries/

REM 使用淘宝镜像
set npm_config_registry=https://registry.npmmirror.com

cd /d "%~dp0"

REM 清理旧依赖
if exist node_modules rd /s /q node_modules
if exist package-lock.json del package-lock.json

REM 安装依赖
npm install

if %errorlevel% equ 0 (
    echo.
    echo 安装成功！
    echo.
    echo 运行开发模式: npm run dev
    echo 构建应用: npm run electron:build
) else (
    echo.
    echo 安装失败，请检查网络连接后重试
    pause
)
