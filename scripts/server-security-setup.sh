#!/bin/bash
# 阿里云 ECS Ubuntu 22.04 最小安全加固方案
# 请按顺序执行，每一步执行后检查是否成功再继续下一步

set -e  # 遇到错误立即退出

echo "=========================================="
echo "阿里云 ECS 安全加固脚本"
echo "=========================================="
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}错误: 请使用 root 用户执行此脚本${NC}"
    exit 1
fi

echo -e "${YELLOW}步骤 1: 创建普通用户${NC}"
echo "请输入新用户名（建议使用你的名字拼音，如: zhangsan）:"
read -r NEW_USER

if id "$NEW_USER" &>/dev/null; then
    echo -e "${YELLOW}用户 $NEW_USER 已存在，跳过创建${NC}"
else
    # 创建用户并添加到 sudo 组
    useradd -m -s /bin/bash "$NEW_USER"
    usermod -aG sudo "$NEW_USER"
    echo -e "${GREEN}✓ 用户 $NEW_USER 创建成功${NC}"
fi

echo ""
echo -e "${YELLOW}步骤 2: 配置 SSH Key（手动配置）${NC}"
echo "请在你的本地机器执行以下命令生成 SSH Key（如果还没有）:"
echo ""
echo "ssh-keygen -t ed25519 -C \"your_email@example.com\""
echo ""
echo "然后执行以下命令将公钥复制到服务器:"
echo ""
echo "ssh-copy-id $NEW_USER@$(hostname -I | awk '{print $1}')"
echo ""
echo "或者手动执行:"
echo "cat ~/.ssh/id_ed25519.pub | ssh $NEW_USER@$(hostname -I | awk '{print $1}') 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'"
echo ""
echo -e "${YELLOW}请在配置好 SSH Key 后，按 Enter 继续...${NC}"
read -r

# 检查 authorized_keys 是否存在
if [ ! -f "/home/$NEW_USER/.ssh/authorized_keys" ] || [ ! -s "/home/$NEW_USER/.ssh/authorized_keys" ]; then
    echo -e "${RED}警告: 未检测到 SSH Key，建议先配置好 SSH Key 再继续${NC}"
    echo "是否继续？(y/N)"
    read -r confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        exit 1
    fi
else
    # 设置正确的权限
    chown -R "$NEW_USER:$NEW_USER" "/home/$NEW_USER/.ssh"
    chmod 700 "/home/$NEW_USER/.ssh"
    chmod 600 "/home/$NEW_USER/.ssh/authorized_keys"
    echo -e "${GREEN}✓ SSH Key 配置完成${NC}"
fi

echo ""
echo -e "${YELLOW}步骤 3: 配置 SSH 安全设置${NC}"

# 备份原配置
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ SSH 配置已备份${NC}"

# 配置 SSH
cat >> /etc/ssh/sshd_config << 'EOF'

# ============================================
# 安全加固配置 (自动添加)
# ============================================
# 禁止 root 密码登录
PermitRootLogin no

# 禁止密码认证（只允许 SSH Key）
PasswordAuthentication no

# 禁止空密码
PermitEmptyPasswords no

# 禁用 X11 转发（如果不需要）
X11Forwarding no

# 设置最大认证尝试次数
MaxAuthTries 3

# 设置客户端存活间隔（防止连接超时）
ClientAliveInterval 300
ClientAliveCountMax 2

# 使用更安全的加密算法
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha2-256,hmac-sha2-512
KexAlgorithms curve25519-sha256@libssh.org,ecdh-sha2-nistp521,ecdh-sha2-nistp384,ecdh-sha2-nistp256
EOF

echo -e "${GREEN}✓ SSH 配置已更新${NC}"

echo ""
echo -e "${YELLOW}步骤 4: 配置 UFW 防火墙${NC}"

# 安装 UFW（如果没有）
if ! command -v ufw &> /dev/null; then
    apt-get update
    apt-get install -y ufw
fi

# 重置 UFW 规则（谨慎操作）
ufw --force reset

# 设置默认策略
ufw default deny incoming
ufw default allow outgoing

# 允许 SSH (22) - 非常重要！先允许 SSH，否则可能被锁定
ufw allow 22/tcp comment 'SSH'
echo -e "${GREEN}✓ 允许 SSH (22)${NC}"

# 允许 HTTP (80)
ufw allow 80/tcp comment 'HTTP'
echo -e "${GREEN}✓ 允许 HTTP (80)${NC}"

# 允许 HTTPS (443)
ufw allow 443/tcp comment 'HTTPS'
echo -e "${GREEN}✓ 允许 HTTPS (443)${NC}"

# 启用 UFW
ufw --force enable

echo ""
echo -e "${GREEN}✓ UFW 防火墙已启用${NC}"
echo ""
ufw status verbose

echo ""
echo -e "${YELLOW}步骤 5: 测试 SSH 配置${NC}"
echo "正在测试 SSH 配置..."
sshd -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SSH 配置测试通过${NC}"
else
    echo -e "${RED}✗ SSH 配置有误，请检查！${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}安全加固完成！${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}重要提示:${NC}"
echo "1. 请先在新终端使用新用户 ($NEW_USER) 测试 SSH 连接:"
echo "   ssh $NEW_USER@$(hostname -I | awk '{print $1}')"
echo ""
echo "2. 确认新用户可以正常登录后，执行以下命令重启 SSH 服务:"
echo "   systemctl restart sshd"
echo ""
echo "3. 如果新用户无法登录，可以回滚 SSH 配置:"
echo "   cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config"
echo "   systemctl restart sshd"
echo ""
echo "4. 当前防火墙状态:"
ufw status
echo ""
echo -e "${RED}警告: 重启 SSH 服务后，root 密码登录将被禁用！${NC}"
echo "请确保你能够使用新用户 ($NEW_USER) 和 SSH Key 登录后再重启！"








