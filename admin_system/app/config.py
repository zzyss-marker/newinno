class Config:
    # API配置
    API_BASE_URL = 'http://localhost:8001/api'  # 确保这个URL是正确的
    API_TOKEN = 'your-admin-token'  # 添加API认证token
    
    # 日志配置
    LOGGING_LEVEL = 'DEBUG'  # 设置为DEBUG以获取更多日志信息
    
    # 其他配置...
    SECRET_KEY = 'your-secret-key'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///admin.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False