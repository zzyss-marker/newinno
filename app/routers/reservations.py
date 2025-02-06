from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import date, datetime, timedelta
from ..database import get_db
from ..models import models
from ..schemas import schemas
from ..utils.auth import get_current_user
from ..utils.validation import check_reservation_conflict

router = APIRouter()

@router.post("/venue", response_model=schemas.VenueReservation)
async def create_venue_reservation(
    reservation: schemas.VenueReservationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 检查预约日期是否至少提前3天
    min_date = datetime.now().date() + timedelta(days=3)
    if reservation.reservation_date < min_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="场地预约需要至少提前3天"
        )
    
    # 检查是否有冲突
    if await check_reservation_conflict(
        db, 
        models.VenueReservation,
        reservation.reservation_date,
        business_time=reservation.business_time,
        venue_type=reservation.venue_type
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot already reserved"
        )
    
    try:
        db_reservation = models.VenueReservation(
            user_id=current_user.user_id,
            venue_type=reservation.venue_type,
            reservation_date=reservation.reservation_date,
            business_time=reservation.business_time,
            purpose=reservation.purpose,
            devices_needed=reservation.devices_needed.dict(),
            status="pending"
        )
        db.add(db_reservation)
        db.commit()
        db.refresh(db_reservation)
        return db_reservation
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/device", response_model=schemas.DeviceReservation)
async def create_device_reservation(
    reservation: schemas.DeviceReservationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_reservation = models.DeviceReservation(
        **reservation.dict(),
        user_id=current_user.user_id,
        status="pending"
    )
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)
    return db_reservation

@router.post("/printer", response_model=schemas.PrinterReservation)
async def create_printer_reservation(
    reservation: schemas.PrinterReservationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 检查打印机是否可用
    printer = db.query(models.Management).filter(
        models.Management.device_or_venue_name == reservation.printer_name,
        models.Management.category == "printer",
        models.Management.available_quantity > 0
    ).first()
    
    if not printer:
        raise HTTPException(status_code=400, detail="Printer not available")
    
    # 检查时间段是否已被预约
    existing_reservation = db.query(models.PrinterReservation).filter(
        models.PrinterReservation.printer_name == reservation.printer_name,
        models.PrinterReservation.reservation_date == reservation.reservation_date,
        models.PrinterReservation.print_time == reservation.print_time,
        models.PrinterReservation.status.in_(["pending", "approved"])
    ).first()
    
    if existing_reservation:
        raise HTTPException(status_code=400, detail="Time slot already reserved")
    
    db_reservation = models.PrinterReservation(
        user_id=current_user.user_id,
        **reservation.dict()
    )
    
    try:
        db.add(db_reservation)
        db.commit()
        db.refresh(db_reservation)
        return db_reservation
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my-reservations", response_model=Dict[str, List])
async def get_my_reservations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的所有预约记录"""
    venue_reservations = db.query(models.VenueReservation).filter(
        models.VenueReservation.user_id == current_user.user_id
    ).all()
    
    device_reservations = db.query(models.DeviceReservation).filter(
        models.DeviceReservation.user_id == current_user.user_id
    ).all()
    
    printer_reservations = db.query(models.PrinterReservation).filter(
        models.PrinterReservation.user_id == current_user.user_id
    ).all()
    
    return {
        "venue_reservations": venue_reservations,
        "device_reservations": device_reservations,
        "printer_reservations": printer_reservations
    }

@router.get("/filter", response_model=Dict[str, List])
async def filter_reservations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    reservation_type: Optional[str] = None
):
    """筛选预约记录"""
    filters = {}
    if start_date:
        filters["reservation_date__gte"] = start_date
    if end_date:
        filters["reservation_date__lte"] = end_date
    if status:
        filters["status"] = status

    # 根据预约类型获取不同的记录
    result = {}
    if not reservation_type or reservation_type == "venue":
        venue_query = db.query(models.VenueReservation)
        for key, value in filters.items():
            if key.startswith("reservation_date"):
                venue_query = venue_query.filter(
                    models.VenueReservation.reservation_date >= value
                    if key.endswith("gte")
                    else models.VenueReservation.reservation_date <= value
                )
            else:
                venue_query = venue_query.filter(
                    getattr(models.VenueReservation, key) == value
                )
        result["venue"] = venue_query.all()

    # ... 类似地添加设备和打印机的筛选逻辑
    return result 