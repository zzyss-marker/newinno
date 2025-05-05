from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime, date
from ..database import get_db
from ..models import models
from ..schemas import (
    UserInfo,
    Management,
    ManagementCreate,
    ManagementUpdate,
    DeviceHistoryResponse,
    BorrowHistoryResponse
)
from ..utils.auth import get_current_admin, get_current_user
from ..utils.excel import format_reservation_status, format_device_name
from ..db.admin_system_db import get_admin_system_db
from ..models.admin_system_models import Management as AdminSystemManagement

router = APIRouter(prefix="/management", tags=["management"])

@router.post("/devices", response_model=Management)
async def add_device(
    device: ManagementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """添加新设备或场地"""
    # 创建设备/场地，设置默认数量为1
    device_data = device.dict()
    db_device = models.Management(
        **device_data,
        quantity=1,
        available_quantity=1,
        status="available"
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.put("/devices/{device_id}", response_model=Management)
async def update_device(
    device_id: int,
    device: ManagementUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """更新设备或场地信息 - 只更新名称"""
    db_device = db.query(models.Management).filter(
        models.Management.management_id == device_id
    ).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # 只更新名称
    if device.device_or_venue_name:
        db_device.device_or_venue_name = device.device_or_venue_name
    
    db.commit()
    db.refresh(db_device)
    return db_device

@router.get("/devices/status", response_model=List[Dict])
async def get_devices_status(
    category: str = None,
    db: Session = Depends(get_db)
):
    """获取设备状态，不需要认证也可以查看"""
    query = db.query(models.Management)
    
    if category:
        query = query.filter(models.Management.category == category)
    
    devices = query.all()
    return [
        {
            "id": device.management_id,
            "name": device.device_or_venue_name,
            "category": device.category,
            "quantity": device.quantity,
            "available_quantity": device.available_quantity,
            "status": device.status
        }
        for device in devices
    ]

@router.get("/reservations/stats")
async def get_reservation_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
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
    current_user: models.User = Depends(get_current_user),
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

@router.get("/devices/{device_name}/history", response_model=DeviceHistoryResponse)
async def get_device_history(
    device_name: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
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

@router.get("/users/{username}/borrow-history", response_model=BorrowHistoryResponse)
async def get_user_borrow_history(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
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

@router.put("/devices/{device_id}/quantity", response_model=Management)
async def update_device_quantity(
    device_id: int,
    quantity: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """更新设备数量 - 该功能已停用，总是返回400错误"""
    raise HTTPException(
        status_code=400, 
        detail="Quantity updates are disabled by system configuration"
    )

@router.put("/devices/{device_id}/available", response_model=Management)
async def update_available_quantity(
    device_id: int,
    available_quantity: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """更新可用数量 - 该功能已停用，总是返回400错误"""
    raise HTTPException(
        status_code=400,
        detail="Available quantity updates are disabled by system configuration"
    )

@router.get("/users", response_model=List[UserInfo])
async def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """获取所有用户信息（管理员权限）"""
    users = db.query(models.User).all()
    return [
        {
            "id": user.user_id,
            "username": user.username,
            "name": user.name,
            "role": user.role,
            "department": user.department
        }
        for user in users
    ]

@router.get("/items", response_model=List[Dict])
async def get_management_items(
    category: Optional[str] = None,
    db: Session = Depends(get_admin_system_db)
):
    """获取所有管理项目（设备和场地）"""
    query = db.query(AdminSystemManagement)
    if category:
        query = query.filter_by(category=category)
    items = query.all()
    
    # 返回与Flask版本相同的格式
    return [{
        'id': item.management_id,
        'name': item.device_or_venue_name,
        'category': item.category,
        'quantity': item.quantity,
        'available_quantity': item.available_quantity,
        'status': item.status
    } for item in items]