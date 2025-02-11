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
sudo nano /etc/nginx/sites-available/default
```

配置内容：

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name youdomain.com; ##记得更改

    ssl_certificate /etc/letsencrypt/live/api.yourdomainn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomainn.com/privkey.pem;


    # API 请求转发到 FastAPI
    location / {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/fastapi /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl restart nginx
```

4. **配置后端服务为系统服务**：

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
User=ubuntu  # 使用你的用户名
WorkingDirectory=/path/to/your/project  # 项目路径
Environment="PATH=/path/to/your/venv/bin"  # 虚拟环境路径
ExecStart=/path/to/your/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl start fastapi
sudo systemctl enable fastapi
```

5. **修改微信小程序配置**：

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
sudo systemctl status fastapi

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
