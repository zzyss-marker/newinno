import mysql.connector
from sqlalchemy import create_engine, Column, Integer, String, Date, DateTime, Enum, JSON, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import enum
import bcrypt

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

# 创建 3D Printer Reservations 表
class PrinterReservation(Base):
    __tablename__ = "printer_reservations"

    reservation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    printer_name = Column(String(50), nullable=False)
    reservation_date = Column(Date, nullable=False)
    print_time = Column(DateTime, nullable=False)
    status = Column(String(50), default="pending")

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
    # 创建表
    Base.metadata.create_all(bind=engine)
    
    session = Session()
    
    try:
        # 插入管理员账号
        password = "123456"
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        admin_user = User(
            username="A001",
            name="管理员",
            password=hashed_password.decode('utf-8'),
            role="admin",
            department="管理部门"
        )
        session.add(admin_user)
        
        # 插入初始设备数据
        initial_data = [
            Management(
                device_or_venue_name="电动螺丝刀",
                category="device",
                quantity=10,  # 增加数量
                available_quantity=10,
                status="available",
                description="电动螺丝刀工具",
                location="工具室"
            ),
            Management(
                device_or_venue_name="万用表",
                category="device",
                quantity=8,  # 增加数量
                available_quantity=8,
                status="available",
                description="数字万用表",
                location="工具室"
            ),
            Management(
                device_or_venue_name="讲座室A",
                category="venue",
                quantity=1,
                available_quantity=1,
                status="available",
                description="大型讲座室",
                location="教学楼101"
            ),
            Management(
                device_or_venue_name="3D打印机1号",
                category="printer",
                quantity=1,
                available_quantity=1,
                status="available",
                description="3D打印机",
                location="实验室"
            )
        ]
        session.add_all(initial_data)
        session.commit()
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    init_db()
    print("数据库和表格创建成功！")
