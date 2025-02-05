from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import date, datetime
from ..database import get_db
from ..models import models
from ..schemas import schemas
from ..utils.auth import get_current_admin
from ..utils.excel import format_reservation_status, format_device_name

router = APIRouter(prefix="/management", tags=["management"])

@router.post("/devices", response_model=schemas.Management)
async def add_device(
    device: schemas.ManagementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """添加新设备或场地"""
    db_device = models.Management(**device.dict())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.put("/devices/{device_id}", response_model=schemas.Management)
async def update_device(
    device_id: int,
    device: schemas.ManagementUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """更新设备或场地信息"""
    db_device = db.query(models.Management).filter(
        models.Management.management_id == device_id
    ).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    for key, value in device.dict(exclude_unset=True).items():
        setattr(db_device, key, value)
    
    db.commit()
    db.refresh(db_device)
    return db_device

@router.get("/devices/status", response_model=List[schemas.Management])
async def get_devices_status(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """获取设备使用状态"""
    query = db.query(models.Management)
    if category:
        query = query.filter(models.Management.category == category)
    return query.all()

@router.get("/reservations/stats", response_model=schemas.ReservationStats)
async def get_reservation_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """获取预约统计信息"""
    return {
        "pending_count": {
            "venue": db.query(models.VenueReservation).filter(
                models.VenueReservation.status == "pending"
            ).count(),
            "device": db.query(models.DeviceReservation).filter(
                models.DeviceReservation.status == "pending"
            ).count(),
            "printer": db.query(models.PrinterReservation).filter(
                models.PrinterReservation.status == "pending"
            ).count(),
        },
        "approved_count": {
            "venue": db.query(models.VenueReservation).filter(
                models.VenueReservation.status == "approved"
            ).count(),
            "device": db.query(models.DeviceReservation).filter(
                models.DeviceReservation.status == "approved"
            ).count(),
            "printer": db.query(models.PrinterReservation).filter(
                models.PrinterReservation.status == "approved"
            ).count(),
        }
    }

@router.get("/usage-stats", response_model=Dict)
async def get_usage_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """获取设备使用统计"""
    stats = {
        "devices": {},
        "venues": {},
        "printers": {}
    }
    
    # 统计设备使用情况
    devices = db.query(models.Management).filter(
        models.Management.category == "device"
    ).all()
    
    for device in devices:
        usage_count = db.query(models.DeviceReservation).filter(
            models.DeviceReservation.device_name == device.device_or_venue_name,
            models.DeviceReservation.status == "approved"
        ).count()
        
        stats["devices"][device.device_or_venue_name] = {
            "total": device.quantity,
            "available": device.available_quantity,
            "usage_count": usage_count
        }
    
    # ... 类似地添加场地和打印机的统计
    return stats 

@router.get("/devices/{device_name}/history", response_model=schemas.DeviceHistoryResponse)
async def get_device_history(
    device_name: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """获取设备借用历史"""
    # 修改查询逻辑，使用模糊匹配
    device = db.query(models.Management).filter(
        models.Management.device_or_venue_name == "电动螺丝刀"  # 修改这里，匹配中文名称
    ).first()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # 构建查询
    query = db.query(models.DeviceReservation).filter(
        models.DeviceReservation.device_name == "electric_screwdriver"  # 修改这里，匹配英文名称
    )
    
    if start_date:
        query = query.filter(models.DeviceReservation.borrow_time >= start_date)
    if end_date:
        query = query.filter(models.DeviceReservation.borrow_time <= end_date)
    
    reservations = query.order_by(models.DeviceReservation.borrow_time.desc()).all()
    
    # 统计使用情况
    total_usage = len(reservations)
    on_time_returns = sum(1 for r in reservations 
                         if r.status == "returned" and 
                         r.actual_return_time and 
                         r.actual_return_time <= r.return_time)
    
    history = [{
        "借用人": f"{r.user.name}({r.user.username})",
        "所属部门": r.user.department,
        "借用时间": r.borrow_time.strftime("%Y年%m月%d日 %H:%M"),
        "预计归还时间": r.return_time.strftime("%Y年%m月%d日 %H:%M"),
        "实际归还时间": r.actual_return_time.strftime("%Y年%m月%d日 %H:%M") if r.actual_return_time else "未归还",
        "借用原因": r.reason,
        "状态": format_reservation_status(r.status)
    } for r in reservations]
    
    # 统计状态分布
    status_stats = {
        "pending": query.filter(models.DeviceReservation.status == "pending").count(),
        "approved": query.filter(models.DeviceReservation.status == "approved").count(),
        "returned": query.filter(models.DeviceReservation.status == "returned").count(),
        "rejected": query.filter(models.DeviceReservation.status == "rejected").count()
    }
    
    return {
        "device_name": device.device_or_venue_name,
        "total_usage": total_usage,
        "current_status": device.status,
        "history": history,
        "usage_stats": status_stats
    }

@router.get("/users/{username}/borrow-history", response_model=schemas.BorrowHistoryResponse)
async def get_user_borrow_history(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """获取用户借用历史"""
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 获取所有借用记录
    reservations = db.query(models.DeviceReservation).filter(
        models.DeviceReservation.user_id == user.user_id
    ).order_by(models.DeviceReservation.borrow_time.desc()).all()
    
    # 计算按时归还率
    completed_borrows = [r for r in reservations if r.status == "returned"]
    on_time_returns = sum(1 for r in completed_borrows 
                         if r.actual_return_time and r.actual_return_time <= r.return_time)
    return_rate = on_time_returns / len(completed_borrows) if completed_borrows else 0
    
    history = [{
        "设备名称": format_device_name(r.device_name),
        "借用时间": r.borrow_time.strftime("%Y年%m月%d日 %H:%M"),
        "预计归还时间": r.return_time.strftime("%Y年%m月%d日 %H:%M"),
        "实际归还时间": r.actual_return_time.strftime("%Y年%m月%d日 %H:%M") if r.actual_return_time else "未归还",
        "借用原因": r.reason,
        "状态": format_reservation_status(r.status),
        "是否按时归还": "是" if r.actual_return_time and r.actual_return_time <= r.return_time else "否"
    } for r in reservations]
    
    return {
        "user_name": user.name,
        "user_department": user.department,
        "borrow_count": len(reservations),
        "return_rate": return_rate,
        "history": history
    }

@router.put("/devices/{device_id}/quantity", response_model=schemas.Management)
async def update_device_quantity(
    device_id: int,
    quantity: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """更新设备数量"""
    device = db.query(models.Management).filter(
        models.Management.management_id == device_id
    ).first()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # 计算新的可用数量
    diff = quantity - device.quantity
    new_available = device.available_quantity + diff
    
    if new_available < 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot reduce quantity below current borrowed amount"
        )
    
    device.quantity = quantity
    device.available_quantity = new_available
    
    try:
        db.commit()
        db.refresh(device)
        return device
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error updating quantity: {str(e)}"
        )

@router.put("/devices/{device_id}/available", response_model=schemas.Management)
async def update_available_quantity(
    device_id: int,
    available_quantity: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """更新可用数量"""
    device = db.query(models.Management).filter(
        models.Management.management_id == device_id
    ).first()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    if available_quantity > device.quantity:
        raise HTTPException(
            status_code=400,
            detail="Available quantity cannot exceed total quantity"
        )
    
    if available_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail="Available quantity cannot be negative"
        )
    
    device.available_quantity = available_quantity
    
    try:
        db.commit()
        db.refresh(device)
        return device
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error updating available quantity: {str(e)}"
        ) 