#!/bin/bash

# ASBT Electron 安装脚本
# 用于在网络正常的环境下安装依赖

echo "开始安装 ASBT Electron 依赖..."

# 设置 Electron 镜像（使用国内镜像）
export ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://cdn.npmmirror.com/binaries/electron-builder-binaries/

# 使用淘宝镜像
export npm_config_registry=https://registry.npmmirror.com

cd "$(dirname "$0")"

# 清理旧依赖
rm -rf node_modules package-lock.json

# 安装依赖
npm install

# 检查是否安装成功
if [ $? -eq 0 ]; then
    echo "安装成功！"
    echo ""
    echo "运行开发模式: npm run dev"
    echo "构建应用: npm run electron:build"
else
    echo "安装失败，请检查网络连接后重试"
    exit 1
fi
