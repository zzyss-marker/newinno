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
    # 检查是否提前三天预约
    if (reservation.reservation_date - datetime.now().date()).days < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Venue must be reserved at least 3 days in advance"
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
            venue_type=reservation.venue_type,  # 直接使用中文值
            reservation_date=reservation.reservation_date,
            business_time=reservation.business_time,  # 直接使用中文值
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
        user_id=current_user.user_id
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
    # 检查是否提前一天预约
    if (reservation.reservation_date - datetime.now().date()).days < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Printer must be reserved at least 1 day in advance"
        )
    
    db_reservation = models.PrinterReservation(
        **reservation.dict(),
        user_id=current_user.user_id
    )
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)
    return db_reservation

@router.get("/my-reservations", response_model=dict)
async def get_my_reservations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
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