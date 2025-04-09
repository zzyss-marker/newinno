from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate
from .config import Config
import logging
import os

db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()

def create_app(config_class=Config):
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
    
    # 配置数据库
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'admin.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 确保instance文件夹存在
    try:
        os.makedirs(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance'))
    except OSError:
        pass
    
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
    
    return app 