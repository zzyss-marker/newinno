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
    PrinterReservation,
    DeviceReturnUpdate,
    PrinterCompletionUpdate
)
from ..utils.auth import get_current_user
from ..utils.validation import check_reservation_conflict
from ..models.models import DeviceNames
import hashlib
import json

router = APIRouter(prefix="/api/reservations", tags=["reservations"])

# 存储最近处理的请求哈希值，用于防止重复提交
recent_requests = {}

def generate_request_hash(user_id: int, data: dict) -> str:
    """生成请求的哈希值，用于检测重复提交"""
    # 将用户ID和请求数据组合成一个字符串
    data_str = f"{user_id}_{json.dumps(data, sort_keys=True)}"
    # 计算哈希值
    hash_obj = hashlib.md5(data_str.encode())
    return hash_obj.hexdigest()

def check_duplicate_request(user_id: int, data: dict, request_type: str) -> bool:
    """检查是否是重复提交的请求

    Args:
        user_id: 用户ID
        data: 请求数据
        request_type: 请求类型（venue, device, printer）

    Returns:
        bool: 如果是重复请求返回True，否则返回False
    """
    # 生成请求哈希值
    request_hash = generate_request_hash(user_id, data)

    # 检查是否存在相同的请求哈希值
    key = f"{user_id}_{request_type}"
    if key in recent_requests and recent_requests[key] == request_hash:
        # 如果存在相同的请求哈希值，说明是重复提交
        print(f"检测到重复提交: user_id={user_id}, request_type={request_type}")
        return True

    # 存储当前请求的哈希值
    recent_requests[key] = request_hash
    return False

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
        # 检查是否是重复提交
        if check_duplicate_request(current_user.user_id, reservation.model_dump(), "venue"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="检测到重复提交，请勿重复点击提交按钮"
            )

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
        # 检查是否是重复提交
        if check_duplicate_request(current_user.user_id, reservation.model_dump(), "device"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="检测到重复提交，请勿重复点击提交按钮"
            )

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
            teacher_name=reservation.teacher_name,  # 添加指导老师信息
            status="pending"
        )

        # 打印创建的预约记录，但不打印内部状态
        print(f"创建的预约记录: 用户ID={db_reservation.user_id}, 设备名称={db_reservation.device_name}, 借用时间={db_reservation.borrow_time}, 使用类型={db_reservation.usage_type}")

        # 添加到数据库会话并提交
        db.add(db_reservation)
        db.commit()
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
            "usage_type": db_reservation.usage_type,
            "teacher_name": db_reservation.teacher_name  # 返回指导老师信息
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
        # 检查是否是重复提交
        if check_duplicate_request(current_user.user_id, reservation.model_dump(), "printer"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="检测到重复提交，请勿重复点击提交按钮"
            )

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
            teacher_name=reservation.teacher_name,  # 添加指导老师信息
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
            "model_name": db_reservation.model_name,
            "teacher_name": db_reservation.teacher_name  # 返回指导老师信息
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
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 10,
    status: Optional[str] = None,
    reservation_type: Optional[str] = None
):
    """获取当前用户的预约记录，支持分页和筛选"""
    try:
        # 构建基础查询
        venue_query = db.query(models.VenueReservation).filter(
            models.VenueReservation.user_id == current_user.user_id
        )

        device_query = db.query(models.DeviceReservation).filter(
            models.DeviceReservation.user_id == current_user.user_id
        )

        printer_query = db.query(models.PrinterReservation).filter(
            models.PrinterReservation.user_id == current_user.user_id
        )

        # 添加状态筛选
        if status:
            venue_query = venue_query.filter(models.VenueReservation.status == status)
            device_query = device_query.filter(models.DeviceReservation.status == status)
            printer_query = printer_query.filter(models.PrinterReservation.status == status)

        # 添加预约类型筛选
        if reservation_type:
            if reservation_type == 'venue':
                device_query = device_query.filter(False)  # 不查询设备预约
                printer_query = printer_query.filter(False)  # 不查询打印机预约
            elif reservation_type == 'device':
                venue_query = venue_query.filter(False)  # 不查询场地预约
                printer_query = printer_query.filter(False)  # 不查询打印机预约
            elif reservation_type == 'printer':
                venue_query = venue_query.filter(False)  # 不查询场地预约
                device_query = device_query.filter(False)  # 不查询设备预约

        # 计算总记录数
        total_venues = venue_query.count()
        total_devices = device_query.count()
        total_printers = printer_query.count()
        total_count = total_venues + total_devices + total_printers

        # 添加排序 - 按创建时间倒序排列
        venue_query = venue_query.order_by(models.VenueReservation.created_at.desc())
        device_query = device_query.order_by(models.DeviceReservation.created_at.desc())
        printer_query = printer_query.order_by(models.PrinterReservation.created_at.desc())

        # 计算分页偏移量
        offset = (page - 1) * page_size

        # 执行查询并应用分页
        venue_reservations = venue_query.offset(offset).limit(page_size).all()

        # 如果场地预约不足page_size，则查询设备预约
        remaining = page_size - len(venue_reservations)
        if remaining > 0:
            device_reservations = device_query.offset(max(0, offset - total_venues)).limit(remaining).all()
        else:
            device_reservations = []

        # 如果场地+设备预约不足page_size，则查询打印机预约
        remaining = page_size - len(venue_reservations) - len(device_reservations)
        if remaining > 0:
            printer_reservations = printer_query.offset(max(0, offset - total_venues - total_devices)).limit(remaining).all()
        else:
            printer_reservations = []

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
                "status": res.status,
                "created_at": res.created_at.strftime('%Y-%m-%d %H:%M:%S') if res.created_at else None
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
                "teacher_name": res.teacher_name,
                "usage_type": res.usage_type,
                "status": res.status,
                # 无论任何状态，始终添加设备状态信息
                "device_condition": res.device_condition,
                "return_note": res.return_note,
                "created_at": res.created_at.strftime('%Y-%m-%d %H:%M:%S') if res.created_at else None
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
                "teacher_name": res.teacher_name,
                "status": res.status,
                # 无论任何状态，始终添加打印机状态信息
                "printer_condition": res.printer_condition,
                "completion_note": res.completion_note,
                "created_at": res.created_at.strftime('%Y-%m-%d %H:%M:%S') if res.created_at else None
            })

        # 按创建时间排序
        result.sort(key=lambda x: x.get('created_at') or '', reverse=True)

        # 返回分页信息和数据
        return {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size,
            "data": result
        }
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

@router.post("/device/return")
async def submit_device_return(
    return_data: DeviceReturnUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """提交设备归还状态"""
    try:
        # 查找预约记录
        db_reservation = db.query(models.DeviceReservation).filter(
            models.DeviceReservation.reservation_id == return_data.id
        ).first()

        if not db_reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="预约记录不存在"
            )

        # 验证是否是当前用户的预约
        if db_reservation.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无法提交他人的设备归还"
            )

        # 验证预约状态
        if db_reservation.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"该预约当前状态为{db_reservation.status}，不能提交归还"
            )

        # 更新归还状态
        db_reservation.device_condition = return_data.device_condition
        db_reservation.return_note = return_data.return_note
        db_reservation.actual_return_time = datetime.now()
        db_reservation.status = "return_pending"  # 设置为等待归还审批

        db.commit()
        db.refresh(db_reservation)

        return {
            "message": "设备归还状态已提交，等待管理员审批",
            "reservation_id": db_reservation.reservation_id,
            "status": db_reservation.status
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"设备归还提交失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"设备归还提交失败: {str(e)}"
        )

@router.post("/device/return-direct")
async def submit_device_return_direct(
    return_data: DeviceReturnUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """提交设备归还状态（直接完成，无需审批）"""
    try:
        # 查找预约记录
        db_reservation = db.query(models.DeviceReservation).filter(
            models.DeviceReservation.reservation_id == return_data.id
        ).first()

        if not db_reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="预约记录不存在"
            )

        # 验证是否是当前用户的预约
        if db_reservation.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无法提交他人的设备归还"
            )

        # 验证预约状态
        if db_reservation.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"该预约当前状态为{db_reservation.status}，不能提交归还"
            )

        # 确保设备状态值有效
        valid_conditions = ["normal", "damaged"]
        if return_data.device_condition not in valid_conditions:
            return_data.device_condition = "normal"

        # 记录原始请求数据用于调试
        print(f"设备归还请求数据: id={return_data.id}, condition={return_data.device_condition}, note={return_data.return_note}")

        # 更新归还状态和设备状态
        db_reservation.device_condition = return_data.device_condition
        db_reservation.return_note = return_data.return_note
        db_reservation.actual_return_time = datetime.now()
        db_reservation.status = "returned"  # 直接设置为已归还

        # 更新设备可用数量
        device = db.query(models.Management).filter(
            models.Management.device_or_venue_name == db_reservation.device_name
        ).first()

        if device:
            device.available_quantity += 1

            # 如果设备状态为故障，更新设备状态
            if return_data.device_condition == "damaged":
                device.status = "maintenance"

        # 提交更改
        db.commit()
        db.refresh(db_reservation)

        # 记录更新后的数据用于调试
        print(f"设备归还更新后数据: id={db_reservation.reservation_id}, condition={db_reservation.device_condition}, status={db_reservation.status}")

        # 返回完整的信息
        return {
            "message": "设备归还成功",
            "reservation_id": db_reservation.reservation_id,
            "status": db_reservation.status,
            "device_condition": db_reservation.device_condition,
            "return_note": db_reservation.return_note
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"设备归还提交失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"设备归还提交失败: {str(e)}"
        )

@router.post("/printer/complete")
async def submit_printer_completion(
    completion_data: PrinterCompletionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """提交打印机使用完成状态"""
    try:
        # 查找预约记录
        db_reservation = db.query(models.PrinterReservation).filter(
            models.PrinterReservation.reservation_id == completion_data.id
        ).first()

        if not db_reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="预约记录不存在"
            )

        # 验证是否是当前用户的预约
        if db_reservation.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无法提交他人的打印机使用完成状态"
            )

        # 验证预约状态
        if db_reservation.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"该预约当前状态为{db_reservation.status}，不能提交使用完成信息"
            )

        # 更新使用完成状态
        db_reservation.printer_condition = completion_data.printer_condition
        db_reservation.completion_note = completion_data.completion_note
        db_reservation.status = "completion_pending"  # 设置为等待完成审批

        db.commit()
        db.refresh(db_reservation)

        return {
            "message": "打印机使用完成状态已提交，等待管理员审批",
            "reservation_id": db_reservation.reservation_id,
            "status": db_reservation.status
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"打印机使用完成提交失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"打印机使用完成提交失败: {str(e)}"
        )

@router.post("/printer/complete-direct")
async def submit_printer_completion_direct(
    completion_data: PrinterCompletionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """提交打印机使用完成状态（直接完成，无需审批）"""
    try:
        # 查找预约记录
        db_reservation = db.query(models.PrinterReservation).filter(
            models.PrinterReservation.reservation_id == completion_data.id
        ).first()

        if not db_reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="预约记录不存在"
            )

        # 验证是否是当前用户的预约
        if db_reservation.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无法提交他人的打印机使用完成状态"
            )

        # 验证预约状态
        if db_reservation.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"该预约当前状态为{db_reservation.status}，不能提交使用完成信息"
            )

        # 确保打印机状态值有效
        valid_conditions = ["normal", "damaged"]
        if completion_data.printer_condition not in valid_conditions:
            completion_data.printer_condition = "normal"

        # 记录原始请求数据用于调试
        print(f"打印机完成请求数据: id={completion_data.id}, condition={completion_data.printer_condition}, note={completion_data.completion_note}")

        # 更新使用完成状态
        db_reservation.printer_condition = completion_data.printer_condition
        db_reservation.completion_note = completion_data.completion_note
        db_reservation.status = "completed"  # 直接设置为已完成

        # 如果打印机状态为故障，更新设备状态
        if completion_data.printer_condition == "damaged":
            printer = db.query(models.Management).filter(
                models.Management.device_or_venue_name == db_reservation.printer_name
            ).first()

            if printer:
                printer.status = "maintenance"

        # 提交更改
        db.commit()
        db.refresh(db_reservation)

        # 记录更新后的数据用于调试
        print(f"打印机完成更新后数据: id={db_reservation.reservation_id}, condition={db_reservation.printer_condition}, status={db_reservation.status}")

        # 返回完整的信息
        return {
            "message": "打印机使用完成提交成功",
            "reservation_id": db_reservation.reservation_id,
            "status": db_reservation.status,
            "printer_condition": db_reservation.printer_condition,
            "completion_note": db_reservation.completion_note
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"打印机使用完成提交失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"打印机使用完成提交失败: {str(e)}"
        )