# 糟糕透了，乱改Nginx会破坏面板的环境，nginx反向代理和证书申请建议在面板搞定，只参考下面的环境安装

# 更新包列表

sudo apt update

# 安装 Python 相关工具

sudo apt install python3 python3-pip python3-venv

# 验证安装

python3 --version
pip3 --version

# 安装开发工具包

sudo apt install python3-dev build-essential

# 安装其他有用的工具

sudo apt install wget curl git

# 升级 pip

python3 -m pip install --upgrade pip

# 更新包列表

sudo apt update

# 安装 Git

sudo apt install git

# 验证安装

git --version

# 配置全局用户名

git config --global user.name "Your Name"

# 配置全局邮箱

git config --global user.email "your.email@example.com"

# 查看配置

git config --list

# 生成 SSH 密钥

ssh-keygen -t ed25519 -C "your.email@example.com"

# 或者使用 RSA

# ssh-keygen -t rsa -b 4096 -C "your.email@example.com"

# 启动 ssh-agent

eval "$(ssh-agent -s)"

# 添加私钥到 ssh-agent

ssh-add ~/.ssh/id_ed25519

# 查看公钥（需要添加到 GitHub/GitLab）

cat ~/.ssh/id_ed25519.pub

# 测试 GitHub 连接

ssh -T git@github.com

# 测试 GitLab 连接

ssh -T git@gitlab.com


# 停止 Nginx 服务

sudosystemctlstopnginx

# 或者

sudoservicenginxstop

# 如果还不行，可以强制杀死进程

sudopkillnginx

# 再次检查端口

sudolsof-i:80

# 如果端口已释放，重新申请证书

sudo certbot --nginx -d api.domain.fun

1. **域名配置**：

- 在阿里云/腾讯云购买域名（比如：yourdomain.com）
- 进行域名备案（预计 1-2 周）
- 添加域名解析：
  ```
  记录类型: A
  主机记录: api    # 这样你的API域名就是 api.yourdomain.com
  记录值: 你的ip地址
  TTL: 600s
  ```

2. nginx的安装

   1.**首先卸载现有的 certbot 相关包**：

```bash
sudo apt remove certbot python3-certbot-nginx
```

2. **然后重新安装 certbot 和 nginx 插件**：

```bash
# 更新软件包列表
sudo apt update

# 安装 snapd（如果还没有安装）
sudo apt install snapd

# 安装 core snap
sudo snap install core

# 刷新 core
sudo snap refresh core

# 删除可能存在的旧版本 certbot
sudo apt remove certbot

# 通过 snap 安装 certbot
sudo snap install --classic certbot

# 创建符号链接
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# 安装 nginx 插件
sudo snap install certbot-nginx
```

3. **确保 nginx 正在运行**：

```bash
sudo systemctl status nginx
```

3. **SSL 证书申请**：

```bash
# 安装 certbot（以 Ubuntu 为例）
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d api.yourdomain.com

#如果是中文域名先运行：python3 -c "print('yourdomain.fun'.encode('idna').decode())"
```

3. **安装和配置 Nginx**：

```bash
# 安装 Nginx
sudo apt install nginx

# 创建 Nginx 配置文件
sudo nano /etc/nginx/sites-available/yourapp
```

配置内容：

```nginx
# HTTP 服务器配置（将 HTTP 重定向到 HTTPS）
server {
    listen 80;                # 监听 80 端口（HTTP）
    listen [::]:80;          # 监听 IPv6 的 80 端口
    server_name yourdomain.com;  # 您的域名
  
    # 将所有 HTTP 请求重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS 服务器配置
server {
    # SSL 配置
    listen 443 ssl;          # 监听 443 端口（HTTPS）
    listen [::]:443 ssl;     # 监听 IPv6 的 443 端口
    server_name yourdomain.com;  # 您的域名

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;     # SSL证书文件
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;   # SSL私钥文件

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;    # 使用的 SSL 协议版本
    ssl_prefer_server_ciphers on;      # 优先使用服务器的加密套件
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;    # 加密算法

    # 反向代理配置
    location / {
        proxy_pass http://localhost:8001;  # 转发到本地的 FastAPI 服务
    
        # 代理的 HTTP 设置
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;  # WebSocket 支持
        proxy_set_header Connection 'upgrade';
    
        # 传递客户端信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;  # 传递真实IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # 传递代理链路
        proxy_set_header X-Forwarded-Proto $scheme;  # 传递协议类型
    
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

启用配置：

```bash
# 创建符号链接到 sites-enabled 目录
sudo ln -s /etc/nginx/sites-available/your_app /etc/nginx/sites-enabled/

# 可选：删除默认配置的符号链接（如果不需要默认站点）
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 如果测试通过，重启 Nginx
sudo systemctl restart nginxsudo nginx -t  # 测试配置
sudo systemctl restart nginx
```

4. **配置后端服务为系统服务（似乎可以不用，宕机后重新运行runme.py**：

```bash
# 创建服务文件
sudo nano /etc/systemd/system/fastapi.service
```

服务文件内容：

```ini
[Unit]
Description=FastAPI application
After=network.target

[Service]
User=your_username  # 替换为您的用户名（whoami）
Group=your_username  # 替换为您的用户组（groups）
WorkingDirectory=/path/to/your/fastapi/app  # 替换为您的FastAPI应用目录
Environment="PATH=/path/to/your/venv/bin"  # 如果使用虚拟环境，替换为实际路径
ExecStart=/path/to/your/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start fastapi

# 检查服务状态
sudo systemctl status fastapi

# 设置开机自启
sudo systemctl enable fastapi
```

6. **修改微信小程序配置**：

```javascript:fore/utils/request.js
const baseURL = 'https://api.yourdomain.com/api'  // 使用 HTTPS
```

6. **微信公众平台配置**：

- 登录 [微信公众平台](https://mp.weixin.qq.com/)
- 进入"开发管理" -> "开发设置"
- 在"服务器域名"下添加：
  ```
  request合法域名: https://api.yourdomain.com
  ```

7. **上传小程序代码**：

- 在微信开发者工具中取消勾选"不校验合法域名"
- 点击"上传"
- 在微信公众平台提交审核

8. **检查清单**：

```bash
# 检查服务状态
sudo systemctl status nginx

# 检查日志
sudo tail -f /var/log/nginx/error.log
sudo journalctl -u fastapi -f

# 检查端口
sudo netstat -tulpn | grep -E '80|443|8001'
```

9. **安全加固**：

```bash
# 配置防火墙
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# 禁用外部直接访问 8001 端口
sudo ufw deny 8001
```

10. **数据库备份脚本**（如果使用 SQLite）：

```bash
#!/bin/bash
backup_dir="/path/to/backups"
date=$(date +%Y%m%d_%H%M%S)
cp /path/to/your/app.db "$backup_dir/app_$date.db"
```

重要提示：

1. 所有路径要使用实际的绝对路径
2. 确保文件权限正确：

```bash
sudo chown -R ubuntu:ubuntu /path/to/your/project
sudo chmod -R 755 /path/to/your/project
```

3. 配置日志轮转：

```bash
sudo nano /etc/logrotate.d/fastapi
```

```
/var/log/fastapi/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
}
```

4. 监控设置：

- 设置服务器监控（如使用 Prometheus + Grafana）
- 配置错误告警（可以用邮件或企业微信通知）

这样配置完成后，你的服务就可以正式上线了。记得定期：

- 检查日志
- 更新系统安全补丁
- 备份数据
- 检查证书有效期

如果遇到问题，可以通过查看各个服务的日志来定位问题。
