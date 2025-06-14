from sqlalchemy.orm import Session
from app.database import engine
from app.models import models
from app.models.models import Management, User, UserRole
from app.models.settings import SystemSettings
import os

def init_db():
    """初始化数据库，创建所有必要的表并添加初始数据"""
    # 创建所有表
    models.Base.metadata.create_all(bind=engine)

    # 检查并添加teacher_name列到相关表
    ensure_teacher_name_columns()

    # 创建数据库会话
    db = Session(engine)
    try:
        # 初始化系统管理员用户
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                name="系统管理员",
                password="admin123",  # 注意：实际使用时应该使用加密后的密码
                role=UserRole.admin,
                department="系统管理部",
                is_system_admin=True  # 添加系统管理员标记
            )
            db.add(admin_user)

        # 初始化设备管理数据
        devices = [
            {
                "device_or_venue_name": "大屏",
                "category": "device",
                "quantity": 2,
                "available_quantity": 2,
                "status": "available"
            },
            {
                "device_or_venue_name": "笔记本",
                "category": "device",
                "quantity": 5,
                "available_quantity": 5,
                "status": "available"
            },
            {
                "device_or_venue_name": "手持麦",
                "category": "device",
                "quantity": 4,
                "available_quantity": 4,
                "status": "available"
            },
            {
                "device_or_venue_name": "鹅颈麦",
                "category": "device",
                "quantity": 4,
                "available_quantity": 4,
                "status": "available"
            },
            {
                "device_or_venue_name": "投屏器",
                "category": "device",
                "quantity": 5,
                "available_quantity": 5,
                "status": "available"
            },
            {
                "device_or_venue_name": "电动螺丝刀",
                "category": "device",
                "quantity": 10,
                "available_quantity": 5,
                "status": "available"
            },
            {
                "device_or_venue_name": "万用表",
                "category": "device",
                "quantity": 5,
                "available_quantity": 3,
                "status": "available"
            }
        ]

        # 添加初始场地数据
        venues = [
            {
                "device_or_venue_name": "讲座厅",
                "category": "venue",
                "quantity": 1,
                "available_quantity": 1,
                "status": "available"
            },
            {
                "device_or_venue_name": "研讨室",
                "category": "venue",
                "quantity": 1,
                "available_quantity": 1,
                "status": "available"
            },
            {
                "device_or_venue_name": "会议室",
                "category": "venue",
                "quantity": 1,
                "available_quantity": 1,
                "status": "available"
            }
        ]

        # 添加设备数据
        for device in devices:
            db_device = db.query(Management).filter(
                Management.device_or_venue_name == device["device_or_venue_name"]
            ).first()

            if not db_device:
                db_device = Management(**device)
                db.add(db_device)

        # 添加场地数据
        for venue in venues:
            db_venue = db.query(Management).filter(
                Management.device_or_venue_name == venue["device_or_venue_name"]
            ).first()

            if not db_venue:
                db_venue = Management(**venue)
                db.add(db_venue)

        # 初始化打印机数据
        printers = [
            {
                "device_or_venue_name": "printer_1",
                "category": "printer",
                "quantity": 1,
                "available_quantity": 1,
                "status": "available"
            },
            {
                "device_or_venue_name": "printer_2",
                "category": "printer",
                "quantity": 1,
                "available_quantity": 1,
                "status": "available"
            },
            {
                "device_or_venue_name": "printer_3",
                "category": "printer",
                "quantity": 1,
                "available_quantity": 1,
                "status": "available"
            }
        ]

        for printer in printers:
            db_printer = db.query(Management).filter(
                Management.device_or_venue_name == printer["device_or_venue_name"]
            ).first()

            if not db_printer:
                db_printer = Management(**printer)
                db.add(db_printer)

        # 初始化系统设置
        ai_feature_setting = db.query(SystemSettings).filter(
            SystemSettings.key == "ai_feature_enabled"
        ).first()

        if not ai_feature_setting:
            ai_feature_setting = SystemSettings(
                key="ai_feature_enabled",
                value="false",
                description="是否启用AI功能界面",
                is_enabled=False
            )
            db.add(ai_feature_setting)
            print("已添加AI功能设置，默认为禁用状态")

        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def ensure_teacher_name_columns():
    """MySQL数据库会自动处理表结构，此函数保留用于兼容性"""
    print("MySQL数据库表结构由SQLAlchemy自动管理，无需手动添加列")