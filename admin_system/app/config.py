import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API配置
    API_BASE_URL = 'http://localhost:8001/api'  # 确保这个URL是正确的

    # 添加代理配置
    PROXY_FIX = True  # 启用代理修复
    PREFERRED_URL_SCHEME = 'http'  # 或 'https'，取决于你的部署环境

    # 日志配置
    LOGGING_LEVEL = 'DEBUG'  # 设置为DEBUG以获取更多日志信息

    # 其他配置...
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key')

    # MySQL数据库配置
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "123456")
    ADMIN_MYSQL_DATABASE = os.getenv("ADMIN_MYSQL_DATABASE", "admin_system")

    SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{ADMIN_MYSQL_DATABASE}?charset=utf8mb4'
    SQLALCHEMY_TRACK_MODIFICATIONS = False