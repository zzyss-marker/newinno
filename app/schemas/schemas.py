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

class VenueReservationCreate(BaseModel):
    venue_type: str
    reservation_date: date
    business_time: str
    purpose: str
    devices_needed: DevicesNeeded

    @validator('venue_type')
    def validate_venue_type(cls, v):
        valid_types = [e.value for e in VenueType]
        if v not in valid_types:
            raise ValueError(f"Invalid venue type. Must be one of: {valid_types}")
        return v

    @validator('business_time')
    def validate_business_time(cls, v):
        valid_times = [e.value for e in BusinessTime]
        if v not in valid_times:
            raise ValueError(f"Invalid business time. Must be one of: {valid_times}")
        return v

    @validator('devices_needed')
    def validate_devices(cls, v):
        if v.laptop and not v.projector:
            v.projector = True
        return v

    class Config:
        orm_mode = True

class VenueReservation(VenueReservationCreate):
    reservation_id: int
    user_id: int
    status: str
    
    class Config:
        orm_mode = True

class DeviceReservationCreate(BaseModel):
    device_name: DeviceType
    borrow_time: datetime
    return_time: datetime
    reason: str

class DeviceReservation(DeviceReservationCreate):
    reservation_id: int
    user_id: int
    status: str
    actual_return_time: Optional[datetime]
    
    class Config:
        orm_mode = True

class PrinterReservationCreate(BaseModel):
    printer_name: PrinterName
    reservation_date: date
    print_time: datetime

class PrinterReservation(PrinterReservationCreate):
    reservation_id: int
    user_id: int
    status: str
    
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