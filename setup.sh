#!/usr/bin/env bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  opentokenhub.fun 一键部署脚本（Ubuntu/Debian）
#  用法：
#    ssh root@<CVM-IP>
#    curl -fsSL https://raw.githubusercontent.com/Guranta/-aigc/main/setup.sh | bash
#  或克隆后执行：
#    bash setup.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -e

DOMAIN="opentokenhub.fun"
REPO="https://github.com/Guranta/-aigc.git"
WEBROOT="/var/www/aigc-rewriter"

echo "🚀 开始部署 ${DOMAIN}"
echo ""

# ─── 1. 检查 root ───
if [ "$EUID" -ne 0 ]; then
  echo "❌ 请用 root 用户执行（或加 sudo）"
  exit 1
fi

# ─── 2. 装依赖 ───
echo "📦 安装 nginx / git / certbot ..."
apt update -qq
apt install -y -qq nginx git certbot python3-certbot-nginx >/dev/null

# ─── 3. 拉代码 ───
echo "📥 拉取代码到 ${WEBROOT} ..."
mkdir -p "${WEBROOT}"
if [ -d "${WEBROOT}/.git" ]; then
  cd "${WEBROOT}"
  git pull -q
else
  rm -rf "${WEBROOT:?}/"* "${WEBROOT:?}/".* 2>/dev/null || true
  git clone -q "${REPO}" "${WEBROOT}"
fi

# ─── 4. 配 nginx ───
echo "⚙️  配置 nginx ..."
cp -f "${WEBROOT}/nginx.conf" /etc/nginx/conf.d/aigc-rewriter.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
systemctl enable nginx >/dev/null 2>&1 || true

# ─── 5. 防火墙 ───
if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
fi

# ─── 6. 完成 ───
echo ""
echo "✅ 部署完成！"
echo ""
echo "🚨 别忘了：腾讯云控制台 → CVM → 安全组 → 入站规则"
echo "   开放 80 (HTTP) 和 443 (HTTPS) 端口给 0.0.0.0/0"
echo ""
echo "🌐 现在试试访问：http://${DOMAIN}"
echo ""
echo "🔐 配置 HTTPS（推荐）："
echo "   certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
echo "🔄 以后更新代码只需在 CVM 上执行："
echo "   cd ${WEBROOT} && git pull"
