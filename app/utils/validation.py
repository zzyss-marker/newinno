from typing import Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy.orm.decl_api import DeclarativeMeta as Base
from ..models.models import VenueReservation, DeviceReservation, Management

async def check_reservation_conflict(
    db: Session,
    model: Base,
    reservation_date: date,
    business_time: Optional[str] = None,
    venue_type: Optional[str] = None,
    device_name: Optional[str] = None
) -> bool:
    """检查预约是否有冲突"""
    query = db.query(model)
    
    if isinstance(model, VenueReservation):
        # 检查场地是否可用
        venue = db.query(Management).filter(
            Management.device_or_venue_name == venue_type,
            Management.category == "venue"
        ).first()
        
        if not venue or venue.available_quantity <= 0:
            return True  # 冲突
            
        # 检查时间段是否已被预约
        query = query.filter(
            VenueReservation.reservation_date == reservation_date,
            VenueReservation.business_time == business_time,
            VenueReservation.venue_type == venue_type,
            VenueReservation.status.in_(["pending", "approved"])
        )
        
        # 如果没有找到预约记录，说明没有冲突
        return query.count() > 0
        
    elif isinstance(model, DeviceReservation):
        # 检查设备是否可用
        device = db.query(Management).filter(
            Management.device_or_venue_name == device_name,
            Management.category == "device"
        ).first()
        
        if not device or device.available_quantity <= 0:
            return True  # 冲突
            
        # 检查是否有未归还的预约
        query = query.filter(
            DeviceReservation.device_name == device_name,
            DeviceReservation.status.in_(["pending", "approved"])
        )
        
        return query.count() >= device.available_quantity
            
    return False  # 默认没有冲突 