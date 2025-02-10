import os

class Config:
    # API配置
    API_BASE_URL = 'http://localhost:8001/api'  # 确保这个URL是正确的
    API_TOKEN = 'your-admin-token'  # 添加API认证token
    
    # 添加代理配置
    PROXY_FIX = True  # 启用代理修复
    PREFERRED_URL_SCHEME = 'http'  # 或 'https'，取决于你的部署环境
    
    # 日志配置
    LOGGING_LEVEL = 'DEBUG'  # 设置为DEBUG以获取更多日志信息
    
    # 其他配置...
    SECRET_KEY = 'your-secret-key'
    
    # 指定数据库路径为项目根目录
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(BASE_DIR, "admin.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False