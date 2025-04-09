from sqlalchemy.orm import Session
from app.database import engine
from app.models import models
from app.models.models import Management, User, UserRole

def init_db():
    """初始化数据库，创建所有必要的表并添加初始数据"""
    # 创建所有表
    models.Base.metadata.create_all(bind=engine)
    
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
            }
        ]
        
        for device in devices:
            db_device = db.query(Management).filter(
                Management.device_or_venue_name == device["device_or_venue_name"]
            ).first()
            
            if not db_device:
                db_device = Management(**device)
                db.add(db_device)
        
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
        
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close() 