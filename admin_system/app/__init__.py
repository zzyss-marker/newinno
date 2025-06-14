from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate
from .config import Config
import logging
import os
from dotenv import load_dotenv

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()

def create_app(config_class=Config):
    # 加载环境变量
    load_dotenv()

    # 在应用启动时禁用代理
    os.environ['NO_PROXY'] = '*'
    os.environ['no_proxy'] = '*'

    app = Flask(__name__)
    app.config.from_object(config_class)

    # 配置日志
    logging.basicConfig(
        level=app.config.get('LOGGING_LEVEL', 'INFO'),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # 配置MySQL数据库
    mysql_host = os.getenv("MYSQL_HOST", "localhost")
    mysql_port = os.getenv("MYSQL_PORT", "3306")
    mysql_user = os.getenv("MYSQL_USER", "root")
    mysql_password = os.getenv("MYSQL_PASSWORD", "123456")
    admin_mysql_database = os.getenv("ADMIN_MYSQL_DATABASE", "admin_system")

    app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{admin_mysql_database}?charset=utf8mb4'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 初始化扩展
    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
    login_manager.login_view = 'auth.login'
    
    # 注册蓝图
    from .routes import admin, auth
    app.register_blueprint(admin.bp)
    app.register_blueprint(auth.bp, url_prefix='/auth')
    
    # 添加用户加载函数
    from .models import User  
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.filter_by(user_id=int(user_id)).first()
    
    with app.app_context():
        # 初始化数据库
        db.create_all()

        # MySQL会自动处理表结构，无需手动添加列
        app_logger = logging.getLogger('app')
        app_logger.info("MySQL数据库初始化完成")

    return app

def ensure_teacher_name_columns():
    """MySQL数据库会自动处理表结构，此函数保留用于兼容性"""
    app_logger = logging.getLogger('app')
    app_logger.info("MySQL数据库表结构由SQLAlchemy自动管理，无需手动添加列")