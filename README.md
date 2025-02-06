# 创新实验室预约系统

一个基于FastAPI和微信小程序的实验室预约管理系统。(需求在docs的path里面)

## 项目结构

.
├── app/                    # 后端代码
│   ├── models/            # 数据库模型
│   ├── routers/           # API路由
│   ├── utils/             # 工具函数
│   └── main.py            # 后端入口文件
├── fore/                  # 微信小程序前端
├── DB/                    # 数据库相关脚本
└── test/                  # 测试代码

## 环境要求

### 后端环境

- Python 3.8+
- FastAPI
- SQLAlchemy
- uvicorn
- MySQL 5.7+ 或 SQLite

### 前端环境

- 微信开发者工具
- Node.js 12+

## 快速开始

### 1. 后端启动

1. 创建并激活虚拟环境

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows
```

2. 安装依赖

```bash
pip install -r requirements.txt
```

3. 初始化数据库（需要先安装MySQL以及mysql-connector-python）

```bash
cd DB
python create.py
```

4. 启动后端服务

```bash
cd app
uvicorn main:app --reload --port 8001
```

服务将在 http://localhost:8001 启动，API文档可访问 http://localhost:8001/docs（API文档在仓库的docs中Backbone也有）

### 2. 前端启动

1. 打开微信开发者工具
2. 导入项目

- 选择项目目录中的 `fore` 文件夹
- 填入自己的小程序 AppID（可使用测试号）

3. 修改配置

- 打开 `fore/config.js`
- 确认 `baseUrl` 配置正确（默认为 `http://localhost:8001/api`）

4. 编译运行

- 点击开发者工具的"编译"按钮

## 测试账号（测试账号需要先生成，应该有临时数据库了直接用）

```
管理员账号：
- 用户名：admin001
- 密码：admin123

学生/教师账号：
- 用户名：201900001
- 密码：123456
```

## 主要功能

1. 用户认证

   - 登录/登出
   - 角色权限控制
2. 场地预约

   - 讲座
   - 研讨室
   - 会议室
3. 设备预约

   - 电动螺丝刀
   - 万用表
4. 3D打印机预约

   - 支持多台打印机预约
5. 管理功能（comming soon...)

   - 预约审批
   - 设备管理
   - 用户管理
   - 数据导出

## 开发说明

### API文档

- 启动后端服务后访问 http://localhost:8001/docs 查看完整API文档
- 支持在线调试API接口

### 数据库

- 默认使用SQLite数据库（test.db）
- 如需使用MySQL，修改 `app/database.py` 中的配置

### 测试

```bash
cd test
python3 test.py
```

## 注意事项

1. 确保后端服务器启动后再运行小程序
2. 小程序需要在微信开发者工具中设置不校验合法域名
3. 生产环境部署时需要修改相关配置和域名设置

## 贡献指南

1. Fork 本仓库
2. 创建新的分支 `git checkout -b feature/your-feature`
3. 提交更改 `git commit -m 'Add some feature'`
4. 推送到分支 `git push origin feature/your-feature`
5. 提交 Pull Request
