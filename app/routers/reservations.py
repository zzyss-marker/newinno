from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import date, datetime, timedelta
from ..database import get_db
from ..models import models
from ..schemas import (
    VenueReservationResponse,
    DeviceReservationResponse,
    PrinterReservationResponse,
    VenueReservation,
    DeviceReservation,
    VenueReservationCreate,
    DeviceReservationCreate,
    PrinterReservationCreate,
    PrinterReservation
)
from ..utils.auth import get_current_user
from ..utils.validation import check_reservation_conflict
from ..models.models import DeviceNames

router = APIRouter(prefix="/api/reservations", tags=["reservations"])

def convert_device_names(devices_needed: dict) -> dict:
    """将设备名称转换为中文"""
    if not devices_needed:
        return {}
    return {
        DeviceNames.from_str(k): v 
        for k, v in devices_needed.items()
    }

@router.post("/venue", response_model=VenueReservation)
async def create_venue_reservation(
    reservation: VenueReservationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """创建场地预约"""
    try:
        # 创建预约记录
        db_reservation = models.VenueReservation(
            user_id=current_user.user_id,
            venue_type=reservation.venue_type,
            reservation_date=datetime.strptime(reservation.reservation_date, "%Y-%m-%d").date(),
            business_time=reservation.business_time,
            purpose=reservation.purpose,
            devices_needed=reservation.devices_needed,
            status="pending"
        )
        
        db.add(db_reservation)
        db.commit()
        db.refresh(db_reservation)
        
        return {
            "id": db_reservation.reservation_id,
            "user_id": db_reservation.user_id,
            "user_name": current_user.name,
            "user_department": current_user.department,
            "status": db_reservation.status,
            "created_at": db_reservation.created_at,
            "venue_type": db_reservation.venue_type,
            "reservation_date": str(db_reservation.reservation_date),
            "business_time": db_reservation.business_time,
            "purpose": db_reservation.purpose,
            "devices_needed": db_reservation.devices_needed
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/device", response_model=DeviceReservation)
async def create_device_reservation(
    reservation: DeviceReservationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """创建设备预约"""
    try:
        # 创建预约记录
        db_reservation = models.DeviceReservation(
            user_id=current_user.user_id,
            device_name=reservation.device_name,
            borrow_time=datetime.strptime(reservation.borrow_time, "%Y-%m-%dT%H:%M:%S"),
            return_time=datetime.strptime(reservation.return_time, "%Y-%m-%dT%H:%M:%S"),
            reason=reservation.reason,
            status="pending"
        )
        
        db.add(db_reservation)
        db.commit()
        db.refresh(db_reservation)
        
        return {
            "id": db_reservation.reservation_id,
            "user_id": db_reservation.user_id,
            "user_name": current_user.name,
            "user_department": current_user.department,
            "status": db_reservation.status,
            "created_at": db_reservation.created_at,
            "device_name": db_reservation.device_name,
            "borrow_time": str(db_reservation.borrow_time),
            "return_time": str(db_reservation.return_time),
            "reason": db_reservation.reason
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/printer", response_model=PrinterReservation)
async def create_printer_reservation(
    reservation: PrinterReservationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """创建打印机预约"""
    try:
        # 创建预约记录
        db_reservation = models.PrinterReservation(
            user_id=current_user.user_id,
            printer_name=reservation.printer_name,
            reservation_date=datetime.strptime(reservation.reservation_date, "%Y-%m-%d").date(),
            print_time=datetime.strptime(reservation.print_time, "%Y-%m-%dT%H:%M:%S"),
            status="pending"
        )
        
        db.add(db_reservation)
        db.commit()
        db.refresh(db_reservation)
        
        return {
            "id": db_reservation.reservation_id,
            "user_id": db_reservation.user_id,
            "user_name": current_user.name,
            "user_department": current_user.department,
            "status": db_reservation.status,
            "created_at": db_reservation.created_at,
            "printer_name": db_reservation.printer_name,
            "reservation_date": str(db_reservation.reservation_date),
            "print_time": str(db_reservation.print_time)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/my-reservations")
async def get_my_reservations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的预约记录"""
    try:
        # 查询该用户的所有类型预约
        venue_reservations = db.query(models.VenueReservation).filter(
            models.VenueReservation.user_id == current_user.user_id
        ).all()
        
        device_reservations = db.query(models.DeviceReservation).filter(
            models.DeviceReservation.user_id == current_user.user_id
        ).all()
        
        printer_reservations = db.query(models.PrinterReservation).filter(
            models.PrinterReservation.user_id == current_user.user_id
        ).all()

        # 转换为响应格式
        result = []
        
        # 添加场地预约
        for res in venue_reservations:
            result.append({
                "type": "venue",
                "reservation_id": res.reservation_id,
                "venue_type": res.venue_type,
                "reservation_date": res.reservation_date.strftime('%Y-%m-%d'),
                "business_time": res.business_time,
                "purpose": res.purpose,
                "devices_needed": res.devices_needed,
                "status": res.status
            })
        
        # 添加设备预约
        for res in device_reservations:
            result.append({
                "type": "device",
                "reservation_id": res.reservation_id,
                "device_name": res.device_name,
                "borrow_time": res.borrow_time.strftime('%Y-%m-%d %H:%M'),
                "return_time": res.return_time.strftime('%Y-%m-%d %H:%M') if res.return_time else None,
                "status": res.status
            })
        
        # 添加打印机预约
        for res in printer_reservations:
            result.append({
                "type": "printer",
                "reservation_id": res.reservation_id,
                "printer_name": res.printer_name,
                "reservation_date": res.reservation_date.strftime('%Y-%m-%d'),
                "print_time": res.print_time.strftime('%H:%M') if res.print_time else None,
                "status": res.status
            })
        
        return result
    except Exception as e:
        print(f"Error getting user reservations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取预约记录失败: {str(e)}"
        )

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