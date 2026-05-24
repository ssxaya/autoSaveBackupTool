@echo off
chcp 65001 > nul
echo ========================================
echo   ASBT 自动存档备份工具 - 打包脚本
echo ========================================
echo.

:: 检查 Python 是否安装
python --version > nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.8 或更高版本
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: 检查是否在正确目录
if not exist "app.py" (
    echo [错误] 请将此脚本放在应用程序目录下运行
    pause
    exit /b 1
)

:: 创建虚拟环境（可选）
echo [提示] 是否创建虚拟环境? (推荐)
echo   Y - 创建新的虚拟环境
echo   N - 使用当前环境
set /p use_venv="请选择 (Y/N): "

if /i "%use_venv%"=="Y" (
    echo.
    echo [步骤 1/4] 创建虚拟环境...
    python -m venv venv
    call venv\Scripts\activate.bat
    
    echo.
    echo [步骤 2/4] 安装依赖...
    pip install -r requirements.txt
) else (
    echo.
    echo [步骤 1/3] 安装依赖...
    pip install -r requirements.txt
)

:: 清理之前的构建
echo.
echo [步骤 3/3] 清理旧构建文件...
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist

:: 使用 PyInstaller 打包
echo.
echo ========================================
echo   开始打包...
echo ========================================
echo.

:: Windows 下使用 pyinstaller 打包
pyinstaller --onefile --windowed --name "ASBT-自动存档备份工具" --add-data "index.html;." --add-data "renderer.js;." app.py

echo.
echo ========================================
echo   打包完成！
echo ========================================
echo.
echo 可执行文件位置: dist\ASBT-自动存档备份工具.exe
echo.

:: 如果创建了虚拟环境，提示用户
if /i "%use_venv%"=="Y" (
    echo 虚拟环境位置: venv\
    echo 如需再次打包，请先运行: venv\Scripts\activate.bat
)

pause
