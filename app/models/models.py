from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, JSON, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from ..database import Base
import enum
from pydantic import BaseModel

class UserRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"

class VenueType(str, enum.Enum):
    lecture = "讲座"
    seminar = "研讨室"
    meeting_room = "会议室"

    @classmethod
    def from_str(cls, value: str) -> str:
        # 支持中文值和枚举名称
        for member in cls:
            if value == member.value or value == member.name:
                return member.value
        raise ValueError(f"Invalid venue type: {value}")

class BusinessTime(str, enum.Enum):
    morning = "上午"
    afternoon = "下午"
    evening = "晚上"

    @classmethod
    def from_str(cls, value: str) -> str:
        # 支持中文值和枚举名称
        for member in cls:
            if value == member.value or value == member.name:
                return member.value
        raise ValueError(f"Invalid business time: {value}")

class DeviceType(str, enum.Enum):
    electric_screwdriver = "electric_screwdriver"
    multimeter = "multimeter"

class PrinterName(str, enum.Enum):
    printer_1 = "printer_1"
    printer_2 = "printer_2"
    printer_3 = "printer_3"

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True)
    name = Column(String(255))
    password = Column(String(255))
    role = Column(Enum(UserRole))
    department = Column(String(255))

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
    
    user = relationship("User")

class DeviceReservation(Base):
    __tablename__ = "device_reservations"

    reservation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    device_name = Column(Enum(DeviceType))
    borrow_time = Column(DateTime)
    return_time = Column(DateTime)
    actual_return_time = Column(DateTime, nullable=True)
    reason = Column(String(255))
    status = Column(String(50), default="pending")  # pending, approved, rejected, returned
    
    user = relationship("User")

class PrinterReservation(Base):
    __tablename__ = "printer_reservations"

    reservation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    printer_name = Column(Enum(PrinterName))
    reservation_date = Column(Date)
    print_time = Column(DateTime)
    status = Column(String(50), default="pending")  # pending, approved, rejected
    
    user = relationship("User")

class Management(Base):
    __tablename__ = "management"

    management_id = Column(Integer, primary_key=True, index=True)
    device_or_venue_name = Column(String(255))
    category = Column(String(50))  # device, venue
    quantity = Column(Integer)
    available_quantity = Column(Integer)
    status = Column(String(50))  # available, maintenance 

class DevicesNeeded(BaseModel):
    screen: bool = False        # 大屏
    laptop: bool = False        # 笔记本
    mic_handheld: bool = False  # 手持麦
    mic_gooseneck: bool = False # 鹅颈麦
    projector: bool = False     # 投屏器（笔记本选中时自动选中） 

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    record_id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("management.management_id"))
    maintenance_date = Column(Date)
    maintenance_type = Column(String(50))  # routine, repair, inspection
    description = Column(Text)
    maintained_by = Column(String(255))
    next_maintenance_date = Column(Date) 