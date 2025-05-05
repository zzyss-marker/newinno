from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from ..models.models import (
    UserRole, 
    VenueType, 
    BusinessTime, 
    DeviceType, 
    PrinterName,
    DevicesNeeded
)
from pydantic import validator

class UserBase(BaseModel):
    username: str
    name: str
    role: UserRole
    department: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    user_id: int

    class Config:
        orm_mode = True

class DevicesNeeded(BaseModel):
    screen: bool = False        # 大屏
    laptop: bool = False        # 笔记本
    mic_handheld: bool = False  # 手持麦
    mic_gooseneck: bool = False # 鹅颈麦
    projector: bool = False     # 投屏器

class VenueReservationCreate(BaseModel):
    venue_type: str
    reservation_date: date
    business_time: str
    purpose: str
    devices_needed: DevicesNeeded

    @validator('business_time')
    def validate_business_time(cls, v):
        valid_times = ['morning', 'afternoon', 'evening']
        if v not in valid_times:
            raise ValueError(f"Invalid business time. Must be one of: {valid_times}")
        return v

    @validator('devices_needed')
    def validate_devices(cls, v):
        if isinstance(v, dict):
            return DevicesNeeded(**v)
        return v

    class Config:
        orm_mode = True

class VenueReservation(VenueReservationCreate):
    reservation_id: int
    user_id: int
    status: str
    created_at: datetime
    user_name: Optional[str] = None
    user_department: Optional[str] = None
    
    class Config:
        orm_mode = True

class DeviceReservationCreate(BaseModel):
    device_name: DeviceType
    borrow_time: datetime
    return_time: Optional[datetime] = None
    reason: str
    usage_type: Optional[str] = "takeaway"

class DeviceReservation(DeviceReservationCreate):
    reservation_id: int
    user_id: int
    status: str
    actual_return_time: Optional[datetime]
    created_at: datetime
    user_name: Optional[str] = None
    user_department: Optional[str] = None
    
    class Config:
        orm_mode = True

class PrinterReservationBase(BaseModel):
    printer_name: str
    reservation_date: date
    print_time: str  # 改为字符串类型，让后端处理时间转换

    @validator('printer_name')
    def validate_printer_name(cls, v):
        if not v:
            raise ValueError("Printer name cannot be empty")
        return v

    @validator('reservation_date')
    def validate_date(cls, v):
        if v < date.today():
            raise ValueError("Reservation date cannot be in the past")
        return v

    @validator('print_time')
    def validate_time(cls, v):
        try:
            # 验证时间格式
            datetime.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError("Invalid time format")

class PrinterReservationCreate(PrinterReservationBase):
    pass

class PrinterReservationInfo(PrinterReservationBase):
    type: str = 'printer'

    @validator('type')
    def validate_type(cls, v):
        if v != 'printer':
            raise ValueError("Type must be 'printer'")
        return v

class PrinterReservation(PrinterReservationBase):
    reservation_id: int
    user_id: int
    status: str
    created_at: datetime
    user_name: Optional[str] = None
    user_department: Optional[str] = None

    class Config:
        orm_mode = True

class ManagementBase(BaseModel):
    device_or_venue_name: str
    category: str
    quantity: int
    available_quantity: int
    status: str

class ManagementCreate(ManagementBase):
    pass

class ManagementUpdate(BaseModel):
    quantity: Optional[int] = None
    available_quantity: Optional[int] = None
    status: Optional[str] = None

class Management(ManagementBase):
    management_id: int

    class Config:
        orm_mode = True

class ReservationStats(BaseModel):
    pending_count: Dict[str, int]
    approved_count: Dict[str, int]

class DeviceHistoryResponse(BaseModel):
    device_name: str
    total_usage: int
    current_status: str
    history: List[Dict[str, Any]]
    usage_stats: Dict[str, int]

    class Config:
        orm_mode = True

class BorrowHistoryResponse(BaseModel):
    user_name: str
    user_department: str
    borrow_count: int
    return_rate: float  # 按时归还率
    history: List[Dict[str, Any]]

    class Config:
        orm_mode = True

class QuantityUpdate(BaseModel):
    quantity: int

    @validator('quantity')
    def validate_quantity(cls, v):
        if v < 0:
            raise ValueError("Quantity cannot be negative")
        return v

class AvailableQuantityUpdate(BaseModel):
    available_quantity: int

    @validator('available_quantity')
    def validate_available_quantity(cls, v):
        if v < 0:
            raise ValueError("Available quantity cannot be negative")
        return v

class UserInfo(BaseModel):
    id: int
    username: str
    name: str
    role: str
    department: Optional[str] = None

    class Config:
        from_attributes = True

# 基础预约信息
class ReservationBase(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_department: str
    status: str
    created_at: datetime

# 场地预约
class VenueReservationInfo(ReservationBase):
    venue_type: str
    reservation_date: date
    business_time: str
    purpose: str
    devices_needed: Dict[str, bool]
    type: str = 'venue'

# 设备预约
class DeviceReservationInfo(BaseModel):
    type: str = 'device'
    device_name: str
    borrow_time: str
    return_time: Optional[str] = None
    status: str
    usage_type: Optional[str] = 'takeaway'  # 添加usage_type字段
    
    @validator('type')
    def validate_type(cls, v):
        if v != 'device':
            raise ValueError("Type must be 'device'")
        return v

# 打印机预约
class PrinterReservationInfo(PrinterReservationBase):
    type: str = 'printer'

# 待审批预约列表
class PendingReservations(BaseModel):
    venue_reservations: List[VenueReservationInfo]
    device_reservations: List[DeviceReservationInfo]
    printer_reservations: List[PrinterReservationInfo]

# 已审批预约列表
class ApprovedReservations(BaseModel):
    venue_reservations: List[VenueReservationInfo]
    device_reservations: List[DeviceReservationInfo]
    printer_reservations: List[PrinterReservationInfo]

# Token响应
class Token(BaseModel):
    access_token: str
    token_type: str

# Token数据
class TokenData(BaseModel):
    username: Optional[str] = None

# 预约状态更新
class ReservationStatusUpdate(BaseModel):
    id: int
    type: str
    status: str

    @validator('type')
    def validate_type(cls, v):
        valid_types = ['venue', 'device', 'printer']
        if v not in valid_types:
            raise ValueError(f'Invalid type. Must be one of: {valid_types}')
        return v

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['approved', 'rejected']
        if v not in valid_statuses:
            raise ValueError(f'Invalid status. Must be one of: {valid_statuses}')
        return v

# 批量审批请求
class BatchApproveRequest(BaseModel):
    reservation_ids: List[int]
    reservation_type: str
    action: str

# 设备归还确认
class DeviceReturnConfirm(BaseModel):
    reservation_id: int
    actual_return_time: datetime 