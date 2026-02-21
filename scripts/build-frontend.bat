@echo off
chcp 65001 >nul
echo [1/3] 安装依赖...
cd /d "%~dp0..\frontend"
@REM call npm install
@REM if %errorlevel% neq 0 (
@REM     echo 安装依赖失败
@REM     exit /b 1
@REM )

echo [2/3] 构建前端...
call npm run build
if %errorlevel% neq 0 (
    echo 构建失败
    exit /b 1
)

echo [3/3] 打包 dist.zip...
if exist dist.zip del dist.zip
powershell -Command "Compress-Archive -Path 'dist\' -DestinationPath 'dist.zip' -Force"
if %errorlevel% neq 0 (
    echo 打包失败
    exit /b 1
)

echo.
echo 完成！输出文件: frontend\dist.zip
