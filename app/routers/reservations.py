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

router = APIRouter()

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
    try:
        # 将字符串日期转换为日期对象
        reservation_date = datetime.strptime(reservation.reservation_date, "%Y-%m-%d").date()
        
        # 检查预约日期是否至少提前3天
        min_date = datetime.now().date()
        if reservation_date < min_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="场地预约需要至少提前3天"
            )
        
        # 检查是否有冲突
        if await check_reservation_conflict(
            db, 
            models.VenueReservation,
            reservation_date,
            business_time=reservation.business_time,
            venue_type=reservation.venue_type
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time slot already reserved"
            )
        
        # 确保 devices_needed 是一个字典并转换设备名称
        devices_needed = convert_device_names(
            reservation.devices_needed if isinstance(reservation.devices_needed, dict) else {}
        )
        
        db_reservation = models.VenueReservation(
            user_id=current_user.user_id,
            venue_type=reservation.venue_type,
            reservation_date=reservation_date,
            business_time=reservation.business_time,
            purpose=reservation.purpose,
            devices_needed=devices_needed,  # 使用转换后的设备名称
            status="pending"
        )
        db.add(db_reservation)
        db.commit()
        db.refresh(db_reservation)
        
        # 构造符合响应模型的数据
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
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format"
        )
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
    try:
        # 将字符串时间转换为datetime对象
        borrow_time = datetime.strptime(reservation.borrow_time, "%Y-%m-%dT%H:%M:%S")
        return_time = datetime.strptime(reservation.return_time, "%Y-%m-%dT%H:%M:%S")
        
        db_reservation = models.DeviceReservation(
            user_id=current_user.user_id,
            device_name=reservation.device_name,
            borrow_time=borrow_time,
            return_time=return_time,
            reason=reservation.reason,
            status="pending"
        )
        db.add(db_reservation)
        db.commit()
        db.refresh(db_reservation)
        
        # 构造符合响应模型的数据
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
            "reason": db_reservation.reason,
            "type": "device"
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid datetime format"
        )
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
    try:
        print("\n开始处理打印机预约请求")
        print("接收到的预约数据:", reservation.dict())

        # 将字符串日期和时间转换为相应的对象
        reservation_date = datetime.strptime(reservation.reservation_date, "%Y-%m-%d").date()
        print_time = datetime.strptime(reservation.print_time, "%Y-%m-%dT%H:%M:%S")
        
        # 检查打印机是否存在
        printer = db.query(models.Management).filter(
            models.Management.device_or_venue_name == reservation.printer_name,
            models.Management.category == "printer"
        ).first()
        
        if not printer:
            # 如果数据库中没有打印机记录，自动创建一个
            printer = models.Management(
                device_or_venue_name=reservation.printer_name,
                category="printer",
                quantity=1,
                available_quantity=1,
                status="available"
            )
            db.add(printer)
            db.commit()
            print(f"创建新打印机记录: {printer.device_or_venue_name}")
        
        # 创建预约记录，状态为待审核
        db_reservation = models.PrinterReservation(
            user_id=current_user.user_id,
            printer_name=reservation.printer_name,
            reservation_date=reservation_date,
            print_time=print_time,
            status="pending"
        )
        
        db.add(db_reservation)
        db.commit()
        db.refresh(db_reservation)
        
        # 构造符合响应模型的数据
        return {
            "id": db_reservation.reservation_id,
            "user_id": db_reservation.user_id,
            "user_name": current_user.name,
            "user_department": current_user.department,
            "status": db_reservation.status,
            "created_at": db_reservation.created_at,
            "printer_name": db_reservation.printer_name,
            "reservation_date": str(db_reservation.reservation_date),  # 转换为字符串
            "print_time": str(db_reservation.print_time)  # 转换为字符串
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date/time format"
        )
    except Exception as e:
        db.rollback()
        print("预约失败:", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

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