from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, JSON, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum
from pydantic import BaseModel
from datetime import datetime

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

    user_id = Column(Integer, primary_key=True)
    username = Column(String(255), unique=True, index=True)
    name = Column(String(255))
    password = Column(String(255))
    role = Column(String(50))  # student, teacher, admin
    department = Column(String(255))
    is_system_admin = Column(Boolean, default=False)  # 系统管理员标记

    # 关联关系
    venue_reservations = relationship("VenueReservation", back_populates="user")
    device_reservations = relationship("DeviceReservation", back_populates="user")
    printer_reservations = relationship("PrinterReservation", back_populates="user")

class VenueReservation(Base):
    __tablename__ = "venue_reservations"

    reservation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    venue_type = Column(String)
    reservation_date = Column(Date)
    business_time = Column(String)
    purpose = Column(String)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.now)
    devices_needed = Column(JSON)
    approver_name = Column(String, nullable=True)
    
    user = relationship("User", back_populates="venue_reservations")

class DeviceReservation(Base):
    __tablename__ = "device_reservations"

    reservation_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    device_name = Column(String(50), nullable=False)
    borrow_time = Column(DateTime, nullable=False)
    return_time = Column(DateTime, nullable=True)  # Changed to nullable for on-site usage
    actual_return_time = Column(DateTime, nullable=True)
    reason = Column(Text)
    status = Column(String(50), default="pending")  # pending, approved, rejected, returned, return_pending
    created_at = Column(DateTime, default=datetime.now)
    usage_type = Column(String(50), default="takeaway")  # 'onsite' or 'takeaway'
    approver_name = Column(String, nullable=True)
    teacher_name = Column(String(100), nullable=True)  # 添加指导老师字段
    device_condition = Column(String(50), nullable=True)  # 归还时设备状态: normal(正常), damaged(故障)
    return_note = Column(Text, nullable=True)  # 归还备注信息
    return_approver = Column(String(100), nullable=True)  # 归还审批人
    
    user = relationship("User", back_populates="device_reservations")

class PrinterReservation(Base):
    __tablename__ = "printer_reservations"

    reservation_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    printer_name = Column(String(50), nullable=False)
    reservation_date = Column(Date, nullable=False)
    print_time = Column(DateTime, nullable=False)  # 保留原有字段，但改为开始时间
    end_time = Column(DateTime, nullable=False)    # 新增结束时间
    estimated_duration = Column(Integer, nullable=True)  # 预计打印耗时（分钟）
    model_name = Column(String(100), nullable=True)  # 打印模型名称
    status = Column(String(50), default="pending")  # pending, approved, rejected, completed, completion_pending
    created_at = Column(DateTime, default=datetime.now)
    approver_name = Column(String, nullable=True)
    teacher_name = Column(String(100), nullable=True)  # 添加指导老师字段
    printer_condition = Column(String(50), nullable=True)  # 使用完成后打印机状态: normal(正常), damaged(故障)
    completion_note = Column(Text, nullable=True)  # 使用完成备注信息
    completion_approver = Column(String(100), nullable=True)  # 完成审批人

    user = relationship("User", back_populates="printer_reservations")

    def __repr__(self):
        return f"<PrinterReservation(id={self.reservation_id}, printer={self.printer_name}, date={self.reservation_date}, time={self.print_time})>"

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

class DeviceNames(str, enum.Enum):
    screen = "大屏"
    laptop = "笔记本"
    mic_handheld = "手持麦"
    mic_gooseneck = "鹅颈麦"
    projector = "投屏器"

    @classmethod
    def from_str(cls, value: str) -> str:
        # 支持中文值和枚举名称
        for member in cls:
            if value == member.value or value == member.name:
                return member.value
        return value  # 如果找不到对应的值，返回原值 