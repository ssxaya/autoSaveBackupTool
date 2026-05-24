@echo off
chcp 65001 > nul

echo ========================================
echo   ASBT 自动存档备份工具 - 一键打包
echo ========================================
echo.

:: 检查 Python
python --version > nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.8 或更高版本
    echo 下载地址: https://www.python.org/downloads/
    echo.
    pause
    exit
)

echo [检查] Python 已安装

:: 安装依赖
echo.
echo [步骤 1/3] 安装依赖...
pip install webview pyinstaller -q
if errorlevel 1 (
    echo [警告] 使用默认源安装失败，尝试使用国内镜像...
    pip install -i https://pypi.tuna.tsinghua.edu.cn/simple webview pyinstaller -q
)

:: 清理
echo.
echo [步骤 2/3] 清理旧文件...
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist

:: 打包
echo.
echo [步骤 3/3] 开始打包...
echo    这可能需要几分钟时间，请耐心等待...
echo.

pyinstaller --onefile --windowed --name "ASBT-自动存档备份工具" --add-data "index.html;." --add-data "renderer.js;." app.py

if errorlevel 1 (
    echo.
    echo [错误] 打包失败！
    echo.
    pause
    exit
)

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
echo exe 文件已生成：
echo dist\ASBT-自动存档备份工具.exe
echo.
echo 可以直接双击运行此文件！
echo.
pause
