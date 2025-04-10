from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate
from .config import Config
import logging
import os
import sqlite3

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
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'admin.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
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
        
        # 确保teacher_name列存在
        ensure_teacher_name_columns(db_path)
    
    return app

def ensure_teacher_name_columns(db_path):
    """确保设备和打印机预约表中包含所有必要列"""
    app_logger = logging.getLogger('app')
    app_logger.info("检查并更新admin系统数据库表结构...")
    
    # 确保数据库文件存在
    if not os.path.exists(db_path):
        app_logger.warning(f"数据库文件 {db_path} 不存在，将稍后自动创建")
        return
    
    try:
        # 连接数据库
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 检查设备预约表中是否存在必要列
        cursor.execute("PRAGMA table_info(device_reservations)")
        columns = {col[1] for col in cursor.fetchall()}
        
        columns_to_add = {
            'teacher_name': 'TEXT',
            'usage_type': 'TEXT',
            'approver_name': 'TEXT',
            'device_condition': 'TEXT',
            'return_note': 'TEXT',
            'return_approver': 'TEXT'
        }
        
        for col_name, col_type in columns_to_add.items():
            if col_name not in columns:
                app_logger.info(f"正在向device_reservations表添加{col_name}列...")
                cursor.execute(f"""
                    ALTER TABLE device_reservations 
                    ADD COLUMN {col_name} {col_type}
                """)
                
        # 检查打印机预约表中是否存在必要列
        cursor.execute("PRAGMA table_info(printer_reservations)")
        columns = {col[1] for col in cursor.fetchall()}
        
        columns_to_add = {
            'teacher_name': 'TEXT',
            'end_time': 'DATETIME',
            'estimated_duration': 'INTEGER',
            'model_name': 'TEXT',
            'approver_name': 'TEXT',
            'printer_condition': 'TEXT',
            'completion_note': 'TEXT',
            'completion_approver': 'TEXT'
        }
        
        for col_name, col_type in columns_to_add.items():
            if col_name not in columns:
                app_logger.info(f"正在向printer_reservations表添加{col_name}列...")
                cursor.execute(f"""
                    ALTER TABLE printer_reservations 
                    ADD COLUMN {col_name} {col_type}
                """)
        
        # 提交更改
        conn.commit()
        app_logger.info("数据库表架构更新完成")
        
    except sqlite3.Error as e:
        app_logger.error(f"数据库错误: {e}")
    
    finally:
        if 'conn' in locals():
            conn.close() 