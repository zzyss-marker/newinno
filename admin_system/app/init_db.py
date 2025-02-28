from . import db
from .models import Management

def init_db():
    """初始化数据库，只在数据库为空时执行"""
    # 首先创建所有表
    db.create_all()
    
    # 检查是否已有数据
    if Management.query.first() is not None:
        return
        
    try:
        # 初始化基础设备
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
                "quantity": 2,
                "available_quantity": 2,
                "status": "available"
            },
            {
                "device_or_venue_name": "投屏器",
                "category": "device",
                "quantity": 3,
                "available_quantity": 3,
                "status": "available"
            },
            {
                "device_or_venue_name": "电动螺丝刀",
                "category": "device",
                "quantity": 2,
                "available_quantity": 2,
                "status": "available"
            },
            {
                "device_or_venue_name": "万用表",
                "category": "device",
                "quantity": 3,
                "available_quantity": 3,
                "status": "available"
            }
        ]
        
        # 初始化基础场地
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
        
        # 添加设备和场地
        for item in devices + venues:
            db_item = Management(**item)
            db.session.add(db_item)
            
        db.session.commit()
        
    except Exception as e:
        db.session.rollback()
        raise e 