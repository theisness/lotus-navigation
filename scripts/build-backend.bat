@echo off
chcp 65001 >nul
echo [1/2] 安装依赖...
cd /d "%~dp0..\backend"
@REM call npm install --omit=dev
@REM if %errorlevel% neq 0 (
@REM     echo 安装依赖失败
@REM     exit /b 1
@REM )

echo [2/2] 打包 backend.zip...
if exist backend.zip del backend.zip
powershell -Command "Get-ChildItem -Exclude 'backend.zip','node_modules','images','.env','package-lock.json' | Compress-Archive -DestinationPath 'backend.zip' -Force"
if %errorlevel% neq 0 (
    echo 打包失败
    exit /b 1
)

echo.
echo 完成！输出文件: backend\backend.zip
