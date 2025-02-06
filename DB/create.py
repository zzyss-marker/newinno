import mysql.connector
from sqlalchemy import create_engine, Column, Integer, String, Date, DateTime, Enum, JSON, ForeignKey, Text, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import enum
import bcrypt
from app.utils.auth import get_password_hash
from app.models.models import Base, User, Management

# 首先创建数据库
def create_database():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="123456"
    )
    cursor = connection.cursor()
    
    # 删除已存在的数据库并重新创建
    cursor.execute("DROP DATABASE IF EXISTS inno")
    cursor.execute("CREATE DATABASE inno")
    
    cursor.close()
    connection.close()

# 创建数据库
create_database()

# 创建数据库连接
engine = create_engine('mysql+mysqlconnector://root:123456@localhost/inno')
Base = declarative_base()
Session = sessionmaker(bind=engine)

# 定义枚举类型
class VenueType(str, enum.Enum):
    lecture = "讲座"
    seminar = "研讨室"
    meeting_room = "会议室"

class BusinessTime(str, enum.Enum):
    morning = "上午"
    afternoon = "下午"
    evening = "晚上"

# 定义表结构
class VenueReservation(Base):
    __tablename__ = "venue_reservations"

    reservation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    venue_type = Column(String(50))  # 改为 String 类型
    reservation_date = Column(Date)
    business_time = Column(String(50))  # 改为 String 类型
    purpose = Column(String(255))
    devices_needed = Column(JSON)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, server_default=func.now())

# 创建 Users 表
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False)  # 学号/工号
    name = Column(String(255), nullable=False)             # 姓名
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    department = Column(String(255))                 # 学院

# 创建 Device Reservations 表
class DeviceReservation(Base):
    __tablename__ = "device_reservations"

    reservation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    device_name = Column(String(50), nullable=False)
    borrow_time = Column(DateTime, nullable=False)
    return_time = Column(DateTime, nullable=False)
    actual_return_time = Column(DateTime)
    reason = Column(Text)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, server_default=func.now())

# 创建 3D Printer Reservations 表
class PrinterReservation(Base):
    __tablename__ = "printer_reservations"

    reservation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    printer_name = Column(String(50), nullable=False)
    reservation_date = Column(Date, nullable=False)
    print_time = Column(DateTime, nullable=False)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, server_default=func.now())

# 创建 Admin 管理表
class Management(Base):
    __tablename__ = "management"

    management_id = Column(Integer, primary_key=True, index=True)
    device_or_venue_name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    quantity = Column(Integer, nullable=False)
    available_quantity = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False)
    description = Column(Text)                # 设备/场地描述
    location = Column(String(255))           # 位置信息
    last_maintenance_date = Column(Date)       # 最后维护日期

# 创建维护记录表
class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    record_id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("management.management_id"))
    maintenance_date = Column(Date, nullable=False)
    maintenance_type = Column(String(50), nullable=False)
    description = Column(Text)
    maintained_by = Column(String(255), nullable=False)
    next_maintenance_date = Column(Date)

def init_db():
    print("开始初始化数据库...")
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    
    db = Session()
    
    try:
        # 初始化打印机
        printers = [
            {
                "device_or_venue_name": "printer_1",
                "category": "printer",
                "quantity": 1,
                "available_quantity": 1,
                "status": "available",
                "description": "3D打印机1号",
                "location": "创新实验室"
            },
            {
                "device_or_venue_name": "printer_2",
                "category": "printer",
                "quantity": 1,
                "available_quantity": 1,
                "status": "available",
                "description": "3D打印机2号",
                "location": "创新实验室"
            },
            {
                "device_or_venue_name": "printer_3",
                "category": "printer",
                "quantity": 1,
                "available_quantity": 1,
                "status": "available",
                "description": "3D打印机3号",
                "location": "创新实验室"
            }
        ]
        
        # 添加打印机
        for printer in printers:
            db_printer = db.query(Management).filter(
                Management.device_or_venue_name == printer["device_or_venue_name"]
            ).first()
            
            if not db_printer:
                print(f"添加打印机: {printer['device_or_venue_name']}")
                db_printer = Management(**printer)
                db.add(db_printer)
            else:
                print(f"更新打印机: {printer['device_or_venue_name']}")
                for key, value in printer.items():
                    setattr(db_printer, key, value)
        
        db.commit()
        
        # 验证打印机数据
        printers_in_db = db.query(Management).filter(
            Management.category == "printer"
        ).all()
        print(f"\n数据库中的打印机数量: {len(printers_in_db)}")
        for printer in printers_in_db:
            print(f"打印机: {printer.device_or_venue_name}, 状态: {printer.status}")
            
    except Exception as e:
        print(f"初始化数据库时出错: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("开始运行数据库初始化脚本...")
    init_db()
    print("脚本执行完成！")
