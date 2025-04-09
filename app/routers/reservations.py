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
            "id": db_reservation.reservation_id,  # 添加id字段
            "reservation_id": db_reservation.reservation_id,
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
        # 打印请求数据进行调试
        print(f"接收到设备预约请求: {reservation}")
        print(f"Usage type: {reservation.usage_type}")
        print(f"Return time: {reservation.return_time}")

        # 处理现场使用情况 (on-site usage)
        return_time = None
        
        # 只有带走使用时才需要解析归还时间
        if reservation.usage_type == "takeaway" and reservation.return_time:
            try:
                return_time = datetime.strptime(reservation.return_time, "%Y-%m-%dT%H:%M:%S")
                print(f"解析归还时间: {return_time}")
            except Exception as e:
                print(f"归还时间解析错误: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"无效的归还时间格式: {str(e)}"
                )
        
        # 解析借用时间
        try:
            borrow_time = datetime.strptime(reservation.borrow_time, "%Y-%m-%dT%H:%M:%S")
        except Exception as e:
            print(f"借用时间解析错误: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的借用时间格式: {str(e)}"
            )
        
        # 创建预约记录 - 只指定必要的字段，让数据库自动生成reservation_id
        db_reservation = models.DeviceReservation(
            user_id=current_user.user_id,
            device_name=reservation.device_name,
            borrow_time=borrow_time,
            return_time=return_time,  # 对于现场使用，这里是None
            reason=reservation.reason,
            usage_type=reservation.usage_type,
            status="pending"
        )
        
        # 打印创建的预约记录，但不打印内部状态
        print(f"创建的预约记录: 用户ID={db_reservation.user_id}, 设备名称={db_reservation.device_name}, 借用时间={db_reservation.borrow_time}, 使用类型={db_reservation.usage_type}")
        
        # 显式开始事务
        db.begin_nested()
        db.add(db_reservation)
        try:
            db.commit()
        except Exception as commit_error:
            db.rollback()
            print(f"提交事务失败: {str(commit_error)}")
            raise
        
        db.refresh(db_reservation)
        
        # 打印提交后的记录ID
        print(f"提交后的预约记录ID: {db_reservation.reservation_id}")
        
        # 返回响应，使用正确的字段名称
        return {
            "id": db_reservation.reservation_id,  # 添加id字段
            "reservation_id": db_reservation.reservation_id,
            "user_id": db_reservation.user_id,
            "user_name": current_user.name,
            "user_department": current_user.department,
            "status": db_reservation.status,
            "created_at": db_reservation.created_at,
            "device_name": db_reservation.device_name,
            "borrow_time": str(db_reservation.borrow_time),
            "return_time": str(db_reservation.return_time) if db_reservation.return_time else None,
            "reason": db_reservation.reason,
            "usage_type": db_reservation.usage_type
        }
    except Exception as e:
        db.rollback()
        print(f"设备预约失败: {str(e)}")
        # 添加更详细的错误信息
        error_detail = f"设备预约失败: {str(e)}\n"
        if "IntegrityError" in str(e):
            error_detail += "数据库完整性错误，可能是必填字段缺失或唯一性约束被违反。"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )

@router.post("/printer", response_model=PrinterReservation)
async def create_printer_reservation(
    reservation: PrinterReservationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """创建打印机预约"""
    try:
        # 解析日期和时间
        reservation_date = datetime.strptime(reservation.reservation_date, "%Y-%m-%d").date()
        print_start_time = datetime.strptime(reservation.print_time, "%Y-%m-%dT%H:%M:%S")
        print_end_time = datetime.strptime(reservation.end_time, "%Y-%m-%dT%H:%M:%S")
        
        # 验证开始时间必须早于结束时间
        if print_start_time >= print_end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="开始时间必须早于结束时间"
            )
        
        # 计算实际打印时长（如果未提供预计时长）
        estimated_duration = reservation.estimated_duration
        if not estimated_duration:
            # 计算分钟差
            duration_minutes = int((print_end_time - print_start_time).total_seconds() / 60)
            estimated_duration = duration_minutes
        
        # 创建预约记录
        db_reservation = models.PrinterReservation(
            user_id=current_user.user_id,
            printer_name=reservation.printer_name,
            reservation_date=reservation_date,
            print_time=print_start_time,
            end_time=print_end_time,
            estimated_duration=estimated_duration,
            model_name=reservation.model_name,
            status="pending"
        )
        
        db.add(db_reservation)
        db.commit()
        db.refresh(db_reservation)
        
        return {
            "id": db_reservation.reservation_id,
            "reservation_id": db_reservation.reservation_id,
            "user_id": db_reservation.user_id,
            "user_name": current_user.name,
            "user_department": current_user.department,
            "status": db_reservation.status,
            "created_at": db_reservation.created_at,
            "printer_name": db_reservation.printer_name,
            "reservation_date": str(db_reservation.reservation_date),
            "print_time": str(db_reservation.print_time),
            "end_time": str(db_reservation.end_time),
            "estimated_duration": db_reservation.estimated_duration,
            "model_name": db_reservation.model_name
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"打印机预约失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建打印机预约失败: {str(e)}"
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
                "id": res.reservation_id,  # 添加id字段
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
                "id": res.reservation_id,  # 添加id字段
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
                "id": res.reservation_id,
                "reservation_id": res.reservation_id,
                "printer_name": res.printer_name,
                "reservation_date": res.reservation_date.strftime('%Y-%m-%d'),
                "print_time": res.print_time.strftime('%H:%M') if res.print_time else None,
                "end_time": res.end_time.strftime('%H:%M') if res.end_time else None,
                "estimated_duration": res.estimated_duration,
                "model_name": res.model_name or "未指定",
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

@router.get("/venue/occupied-times")
async def get_occupied_time_slots(
    venue_type: str,
    date: str,
    db: Session = Depends(get_db)
):
    """获取特定日期和场地类型已被预约的时间段"""
    try:
        # 将日期字符串转换为日期对象
        reservation_date = datetime.strptime(date, "%Y-%m-%d").date()
        
        # 查询该日期该场地类型的所有预约，只考虑待审批和已通过的预约
        # 已拒绝的预约不会阻塞时间段
        reservations = db.query(models.VenueReservation).filter(
            models.VenueReservation.venue_type == venue_type,
            models.VenueReservation.reservation_date == reservation_date,
            models.VenueReservation.status.in_(["pending", "approved"])
        ).all()
        
        # 获取已占用的时间段
        occupied_times = [r.business_time for r in reservations]
        
        return {
            "venue_type": venue_type,
            "date": date,
            "occupied_times": occupied_times
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"获取已占用时间段失败: {str(e)}"
        ) 