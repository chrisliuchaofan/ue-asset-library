#!/bin/bash
# 阿里云 ECS Ubuntu 22.04 快速安全加固 - 直接执行版本
# 使用方法: 修改下面的 NEW_USER 变量，然后执行: sudo bash quick-security-setup.sh

set -e

# ============================================
# 【重要】请先修改这里的用户名
# ============================================
NEW_USER="admin"  # 改为你的用户名，如: zhangsan, liwei 等

# ============================================
# 步骤 1: 创建普通用户
# ============================================
echo "步骤 1: 创建用户 $NEW_USER..."
if id "$NEW_USER" &>/dev/null; then
    echo "用户已存在，跳过创建"
else
    useradd -m -s /bin/bash "$NEW_USER"
    usermod -aG sudo "$NEW_USER"
    echo "✓ 用户创建成功"
fi

# ============================================
# 步骤 2: 配置 SSH Key（需要手动执行）
# ============================================
echo ""
echo "=========================================="
echo "步骤 2: 请在本地机器执行以下命令配置 SSH Key:"
echo "=========================================="
echo ""
echo "ssh-keygen -t ed25519 -C \"your_email@example.com\""
echo "ssh-copy-id $NEW_USER@$(hostname -I | awk '{print $1}')"
echo ""
echo "配置好 SSH Key 后，在服务器上执行以下命令设置权限:"
echo ""
echo "chown -R $NEW_USER:$NEW_USER /home/$NEW_USER/.ssh"
echo "chmod 700 /home/$NEW_USER/.ssh"
echo "chmod 600 /home/$NEW_USER/.ssh/authorized_keys"
echo ""
read -p "已配置好 SSH Key？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请先配置 SSH Key 后再继续"
    exit 1
fi

# 设置 SSH Key 权限（如果存在）
if [ -d "/home/$NEW_USER/.ssh" ]; then
    chown -R "$NEW_USER:$NEW_USER" "/home/$NEW_USER/.ssh"
    chmod 700 "/home/$NEW_USER/.ssh"
    [ -f "/home/$NEW_USER/.ssh/authorized_keys" ] && chmod 600 "/home/$NEW_USER/.ssh/authorized_keys"
    echo "✓ SSH Key 权限已设置"
fi

# ============================================
# 步骤 3: 配置 SSH 安全设置
# ============================================
echo ""
echo "步骤 3: 配置 SSH 安全设置..."

# 备份
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)

# 修改配置
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*PermitEmptyPasswords.*/PermitEmptyPasswords no/' /etc/ssh/sshd_config

# 添加其他安全配置
if ! grep -q "MaxAuthTries" /etc/ssh/sshd_config; then
    echo "MaxAuthTries 3" >> /etc/ssh/sshd_config
fi

# 测试配置
sshd -t
echo "✓ SSH 配置已更新"

# ============================================
# 步骤 4: 配置 UFW 防火墙
# ============================================
echo ""
echo "步骤 4: 配置 UFW 防火墙..."

# 安装 UFW
if ! command -v ufw &> /dev/null; then
    apt-get update -qq
    apt-get install -y ufw
fi

# 重置并配置
ufw --force reset > /dev/null 2>&1 || true
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

echo "✓ 防火墙已配置并启用"
ufw status numbered

# ============================================
# 完成提示
# ============================================
echo ""
echo "=========================================="
echo "✓ 安全加固完成！"
echo "=========================================="
echo ""
echo "⚠️  重要: 请先测试新用户登录:"
echo "   ssh $NEW_USER@$(hostname -I | awk '{print $1}')"
echo ""
echo "确认可以登录后，重启 SSH 服务:"
echo "   systemctl restart sshd"
echo ""









