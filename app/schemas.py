from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, date

# 用户相关模型
class UserBase(BaseModel):
    username: str
    name: str
    department: str
    role: str = "student"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        orm_mode = True

# 预约状态更新模型
class ReservationStatusUpdate(BaseModel):
    id: int
    type: str  # venue, device, printer
    status: str  # approved, rejected

# 打印机预约响应模型
class PrinterReservationResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_department: str
    status: str
    created_at: datetime
    printer_name: str
    reservation_date: str
    print_time: str
    end_time: str
    estimated_duration: Optional[int] = None
    model_name: Optional[str] = None
    approver_name: Optional[str] = None
    teacher_name: Optional[str] = None
    printer_condition: Optional[str] = None
    completion_note: Optional[str] = None
    completion_approver: Optional[str] = None

# 设备预约响应模型
class DeviceReservationResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_department: str
    status: str
    created_at: datetime
    device_name: str
    borrow_time: str
    return_time: Optional[str]
    actual_return_time: Optional[str] = None
    reason: str
    type: str = "device"
    usage_type: str = "takeaway"  # 'onsite' or 'takeaway'
    teacher_name: Optional[str] = None
    device_condition: Optional[str] = None
    return_note: Optional[str] = None
    return_approver: Optional[str] = None

# 场地预约响应模型
class VenueReservationResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_department: str
    status: str
    created_at: datetime
    venue_type: str
    reservation_date: str
    business_time: str
    purpose: str
    devices_needed: Optional[Dict[str, bool]]

# 待审批预约响应模型
class PendingReservations(BaseModel):
    venue_reservations: List[VenueReservationResponse]
    device_reservations: List[DeviceReservationResponse]
    printer_reservations: List[PrinterReservationResponse]

# 已审批预约响应模型
class ApprovedReservations(BaseModel):
    venue_reservations: List[VenueReservationResponse]
    device_reservations: List[DeviceReservationResponse]
    printer_reservations: List[PrinterReservationResponse]

# Token响应模型
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# 在现有代码的基础上添加 UserInfo 模型
class UserInfo(BaseModel):
    id: int
    username: str
    name: str
    role: str
    department: str

# 场地预约创建请求模型
class VenueReservationCreate(BaseModel):
    venue_type: str
    reservation_date: str
    business_time: str
    purpose: str
    devices_needed: Dict[str, bool]

# 设备预约创建请求模型
class DeviceReservationCreate(BaseModel):
    device_name: str
    borrow_time: str
    return_time: Optional[str]  # Optional for on-site usage
    reason: str
    usage_type: str = "takeaway"  # 'onsite' or 'takeaway'
    teacher_name: Optional[str] = None

# 打印机预约创建请求模型
class PrinterReservationCreate(BaseModel):
    printer_name: str
    reservation_date: str
    print_time: str  # 开始时间
    end_time: str    # 结束时间
    estimated_duration: Optional[int] = None  # 预计打印耗时（分钟）
    model_name: Optional[str] = None  # 打印模型名称
    teacher_name: Optional[str] = None

# 场地预约响应模型
class VenueReservation(VenueReservationResponse):
    class Config:
        orm_mode = True

# 设备预约响应模型
class DeviceReservation(DeviceReservationResponse):
    class Config:
        orm_mode = True

# 打印机预约响应模型
class PrinterReservation(PrinterReservationResponse):
    class Config:
        orm_mode = True

# 设备/场地管理模型
class ManagementBase(BaseModel):
    device_or_venue_name: str
    category: str  # venue, device, printer

class ManagementCreate(BaseModel):
    device_or_venue_name: str
    category: str  # venue, device, printer

class ManagementUpdate(BaseModel):
    device_or_venue_name: Optional[str] = None

class Management(BaseModel):
    management_id: int
    device_or_venue_name: str
    category: str  # venue, device, printer
    quantity: int
    available_quantity: int
    status: str
    
    class Config:
        orm_mode = True

# 设备历史记录响应模型
class DeviceHistoryResponse(BaseModel):
    device_name: str
    total_usage: int
    current_status: str
    history: List[Dict]
    usage_stats: Dict[str, int]

# 借用历史响应模型
class BorrowHistoryResponse(BaseModel):
    user_name: str
    user_department: str
    borrow_count: int
    return_rate: float
    history: List[Dict]

# 设备管理相关模型
class DeviceBase(BaseModel):
    device_or_venue_name: str
    category: str  # venue, device, printer
    quantity: int
    available_quantity: int
    status: str = "available"

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    device_or_venue_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    available_quantity: Optional[int] = None
    status: Optional[str] = None

class Device(DeviceBase):
    id: int

    class Config:
        orm_mode = True

# 设备归还状态更新模型
class DeviceReturnUpdate(BaseModel):
    id: int
    device_condition: str  # normal, damaged
    return_note: Optional[str] = None

# 打印机使用完成状态更新模型
class PrinterCompletionUpdate(BaseModel):
    id: int
    printer_condition: str  # normal, damaged
    completion_note: Optional[str] = None 