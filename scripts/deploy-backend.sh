#!/bin/bash
# =============================================================================
# 莲花导航 - 后端一键部署脚本
# 用法: ./deploy-backend.sh
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.deploy"

# 检查 .env.deploy 是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}[错误] $ENV_FILE 不存在${NC}"
    echo -e "${YELLOW}[提示] 请复制 .env.deploy.example 为 .env.deploy 并填入真实配置${NC}"
    exit 1
fi

# 加载环境变量（不导出敏感信息到子进程）
set -a
source "$ENV_FILE"
set +a

# 验证必填项
: "${DEPLOY_HOST:?未设置 DEPLOY_HOST}"
: "${DEPLOY_USER:?未设置 DEPLOY_USER}"
: "${REMOTE_PATH:?未设置 REMOTE_PATH}"
: "${REMOTE_BACKEND_PATH:?未设置 REMOTE_BACKEND_PATH}"

# SSH 选项
SSH_OPTS="-p ${DEPLOY_PORT:-22} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
if [ -n "$DEPLOY_KEY" ]; then
    SSH_OPTS="$SSH_OPTS -i $DEPLOY_KEY"
fi

REMOTE_SSH="ssh ${SSH_OPTS} ${DEPLOY_USER}@${DEPLOY_HOST}"
REMOTE_RSYNC="rsync -az -e \"ssh ${SSH_OPTS}\""

# 时间戳（用于备份目录）
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}[1/5] 检查本地代码完整性...${NC}"
if [ ! -f "$PROJECT_ROOT/backend/package.json" ]; then
    echo -e "${RED}[错误] backend/package.json 不存在${NC}"
    exit 1
fi
echo "OK"

echo -e "${GREEN}[2/5] 备份远程旧代码...${NC}"
$REMOTE_SSH "mkdir -p $REMOTE_PATH/backups" 2>/dev/null || true
BACKUP_DIR="$REMOTE_PATH/backups/backend_${TIMESTAMP}"
echo "备份到: $BACKUP_DIR"
$REMOTE_SSH "cp -r $REMOTE_BACKEND_PATH $BACKUP_DIR && echo '备份完成'"

echo -e "${GREEN}[3/5] 同步新代码到远程...${NC}"
# 排除不需要传输的文件
$REMOTE_RSYNC \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='images' \
    --exclude='.env' \
    --exclude='package-lock.json' \
    --exclude='config.json' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='npm-debug.log*' \
    "$PROJECT_ROOT/backend/" \
    "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_BACKEND_PATH}/"
echo "同步完成"

echo -e "${GREEN}[4/5] 远程安装依赖...${NC}"
$REMOTE_SSH "cd $REMOTE_BACKEND_PATH && npm install --omit=dev --quiet 2>&1 | tail -5"
echo "依赖安装完成"

echo -e "${GREEN}[5/5] 重启后端服务...${NC}"
# 尝试用 systemctl 重启（优先），如果服务不存在则直接 node 启动
if $REMOTE_SSH "systemctl is-active --quiet $REMOTE_SERVICE_NAME" 2>/dev/null; then
    echo "使用 systemd 重启服务: $REMOTE_SERVICE_NAME"
    $REMOTE_SSH "systemctl restart $REMOTE_SERVICE_NAME && echo 'systemctl restart OK'"
elif $REMOTE_SSH "pm2 list" 2>/dev/null | grep -q "$REMOTE_SERVICE_NAME"; then
    echo "使用 pm2 重启服务: $REMOTE_SERVICE_NAME"
    $REMOTE_SSH "pm2 restart $REMOTE_SERVICE_NAME && echo 'pm2 restart OK'"
else
    echo "未检测到 systemd/pm2 服务，直接启动 node..."
    $REMOTE_SSH "pkill -f 'node.*app.js' 2>/dev/null || true; cd $REMOTE_BACKEND_PATH && nohup node app.js > $REMOTE_PATH/backend.log 2>&1 &"
    echo "node 进程已后台启动，日志: $REMOTE_PATH/backend.log"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  后端部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "备份位置: ${YELLOW}$BACKUP_DIR${NC}"
echo -e "后端地址: ${YELLOW}http://${DEPLOY_HOST}:3001${NC}"
echo ""
