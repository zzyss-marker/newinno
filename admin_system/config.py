import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = 'dev'
    # 后端API地址
    BACKEND_API = os.getenv('BACKEND_API', 'http://localhost:8001/api')
    # 管理员数据库
    SQLALCHEMY_DATABASE_URI = 'sqlite:///admin.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    ALLOWED_EXTENSIONS = {'xlsx', 'xls'} 