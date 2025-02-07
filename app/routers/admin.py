from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Optional
from datetime import datetime
from ..database import get_db
from ..models import models
from ..schemas import (  # 直接从schemas模块导入需要的类
    PendingReservations,
    ApprovedReservations,
    ReservationStatusUpdate,
    DeviceCreate,
    DeviceUpdate,
    Device
)
from ..utils.auth import get_current_admin
from ..utils.excel import read_users_excel, export_reservations_excel
import io
from fastapi.responses import StreamingResponse, FileResponse
from ..models.models import DeviceNames
import pandas as pd
import os
from ..utils.security import get_password_hash

router = APIRouter(prefix="/api/admin", tags=["admin"])

def convert_device_names(devices_needed: dict) -> dict:
    """将设备名称转换为中文"""
    if not devices_needed:
        return {}
    return {
        DeviceNames.from_str(k): v 
        for k, v in devices_needed.items()
    }

@router.get("/reservations/pending")
async def get_pending_reservations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """获取待审批的预约记录"""
    try:
        # 查询所有待审批的预约
        venue_reservations = db.query(models.VenueReservation).filter(
            models.VenueReservation.status == "pending"
        ).join(models.User).all()
        
        device_reservations = db.query(models.DeviceReservation).filter(
            models.DeviceReservation.status == "pending"
        ).join(models.User).all()
        
        printer_reservations = db.query(models.PrinterReservation).filter(
            models.PrinterReservation.status == "pending"
        ).join(models.User).all()

        # 转换为响应格式
        return {
            "venue_reservations": [{
                "id": r.reservation_id,
                "user_id": r.user_id,
                "user_name": r.user.name,
                "user_department": r.user.department,
                "status": r.status,
                "created_at": r.created_at,
                "venue_type": r.venue_type,
                "reservation_date": str(r.reservation_date),
                "business_time": r.business_time,
                "purpose": r.purpose,
                "devices_needed": r.devices_needed if isinstance(r.devices_needed, dict) else {}
            } for r in venue_reservations],
            "device_reservations": [{
                "id": r.reservation_id,
                "user_id": r.user_id,
                "user_name": r.user.name,
                "user_department": r.user.department,
                "status": r.status,
                "created_at": r.created_at,
                "device_name": r.device_name,
                "borrow_time": str(r.borrow_time),
                "return_time": str(r.return_time),
                "reason": r.reason
            } for r in device_reservations],
            "printer_reservations": [{
                "id": r.reservation_id,
                "user_id": r.user_id,
                "user_name": r.user.name,
                "user_department": r.user.department,
                "status": r.status,
                "created_at": r.created_at,
                "printer_name": r.printer_name,
                "reservation_date": str(r.reservation_date),
                "print_time": str(r.print_time)
            } for r in printer_reservations]
        }
    except Exception as e:
        print(f"Error getting pending reservations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取待审批预约失败: {str(e)}"
        )

@router.get("/reservations/approved")
async def get_approved_reservations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """获取已审批的预约记录"""
    try:
        # 获取已审批的预约
        venue_reservations = db.query(models.VenueReservation).filter(
            models.VenueReservation.status.in_(['approved', 'rejected'])
        ).join(models.User).all()
        
        device_reservations = db.query(models.DeviceReservation).filter(
            models.DeviceReservation.status.in_(['approved', 'rejected'])
        ).join(models.User).all()
        
        printer_reservations = db.query(models.PrinterReservation).filter(
            models.PrinterReservation.status.in_(['approved', 'rejected'])
        ).join(models.User).all()

        return {
            "venue_reservations": [{
                "id": r.reservation_id,
                "user_id": r.user_id,
                "user_name": r.user.name,
                "user_department": r.user.department,
                "status": r.status,
                "created_at": r.created_at,
                "venue_type": r.venue_type,
                "reservation_date": str(r.reservation_date),
                "business_time": r.business_time,
                "purpose": r.purpose,
                "devices_needed": r.devices_needed if isinstance(r.devices_needed, dict) else {}
            } for r in venue_reservations],
            "device_reservations": [{
                "id": r.reservation_id,
                "user_id": r.user_id,
                "user_name": r.user.name,
                "user_department": r.user.department,
                "status": r.status,
                "created_at": r.created_at,
                "device_name": r.device_name,
                "borrow_time": str(r.borrow_time),
                "return_time": str(r.return_time),
                "reason": r.reason
            } for r in device_reservations],
            "printer_reservations": [{
                "id": r.reservation_id,
                "user_id": r.user_id,
                "user_name": r.user.name,
                "user_department": r.user.department,
                "status": r.status,
                "created_at": r.created_at,
                "printer_name": r.printer_name,
                "reservation_date": str(r.reservation_date),
                "print_time": str(r.print_time)
            } for r in printer_reservations]
        }
    except Exception as e:
        print(f"Error getting approved reservations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取已审批预约失败: {str(e)}"
        )

@router.post("/reservations/approve")
async def approve_reservation(
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)  # 添加管理员验证
):
    """审批预约"""
    try:
        if 'type' not in data or 'id' not in data or 'status' not in data:
            raise HTTPException(status_code=400, detail="缺少必要参数")
        
        reservation_type = data['type']
        reservation_id = data['id']
        new_status = data['status']
        
        # 根据预约类型选择对应的模型
        model_map = {
            "venue": models.VenueReservation,
            "device": models.DeviceReservation,
            "printer": models.PrinterReservation
        }
        
        if reservation_type not in model_map:
            raise HTTPException(status_code=400, detail="无效的预约类型")
        
        # 查找预约记录
        reservation = db.query(model_map[reservation_type]).filter(
            model_map[reservation_type].reservation_id == reservation_id
        ).first()
        
        if not reservation:
            raise HTTPException(status_code=404, detail="预约记录不存在")
        
        # 更新状态
        reservation.status = new_status
        db.commit()
        
        return {"message": "审批成功"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error approving reservation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="审批失败"
        )

@router.post("/reservations/reject")
async def reject_reservation(
    data: ReservationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    try:
        model_map = {
            "venue": models.VenueReservation,
            "device": models.DeviceReservation,
            "printer": models.PrinterReservation
        }
        
        if data.type not in model_map:
            raise HTTPException(status_code=400, detail="Invalid reservation type")
            
        reservation = db.query(model_map[data.type]).filter(
            model_map[data.type].reservation_id == data.id
        ).first()
        
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
            
        reservation.status = data.status
        db.commit()
        return {"message": f"Reservation {data.status}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/device-return/{reservation_id}")
async def confirm_device_return(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    reservation = db.query(models.DeviceReservation).filter(
        models.DeviceReservation.reservation_id == reservation_id
    ).first()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    reservation.status = "returned"
    reservation.actual_return_time = datetime.now()
    db.commit()
    return {"message": "Device return confirmed"}

@router.post("/users/import-excel")
async def import_users_from_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    contents = await file.read()
    users = read_users_excel(io.BytesIO(contents))
    created_users = []
    
    for user_data in users:
        db_user = models.User(**user_data)
        db.add(db_user)
        created_users.append(db_user)
    
    db.commit()
    return {"message": f"Successfully imported {len(created_users)} users"}

@router.get("/export/reservations")
async def export_reservations(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """导出预约记录"""
    try:
        # 使用与列表查询相同的逻辑获取数据
        venue_reservations = db.query(models.VenueReservation).join(
            models.User
        ).options(
            joinedload(models.VenueReservation.user)
        )
        
        device_reservations = db.query(models.DeviceReservation).join(
            models.User
        ).options(
            joinedload(models.DeviceReservation.user)
        )
        
        printer_reservations = db.query(models.PrinterReservation).join(
            models.User
        ).options(
            joinedload(models.PrinterReservation.user)
        )

        # 添加日期过滤
        if start_date:
            venue_reservations = venue_reservations.filter(models.VenueReservation.reservation_date >= start_date)
            device_reservations = device_reservations.filter(models.DeviceReservation.borrow_time >= start_date)
            printer_reservations = printer_reservations.filter(models.PrinterReservation.reservation_date >= start_date)
        
        if end_date:
            venue_reservations = venue_reservations.filter(models.VenueReservation.reservation_date <= end_date)
            device_reservations = device_reservations.filter(models.DeviceReservation.borrow_time <= end_date)
            printer_reservations = printer_reservations.filter(models.PrinterReservation.reservation_date <= end_date)

        # 执行查询
        venue_reservations = venue_reservations.all()
        device_reservations = device_reservations.all()
        printer_reservations = printer_reservations.all()

        # 准备Excel数据
        data = []
        
        # 添加场地预约
        for res in venue_reservations:
            data.append({
                '预约类型': '场地预约',
                '申请人': res.user.name,
                '学院': res.user.department,
                '场地类型': res.venue_type,
                '预约日期': res.reservation_date.strftime('%Y-%m-%d'),
                '时间段': res.business_time,
                '用途': res.purpose,
                '状态': res.status,
                '创建时间': res.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        # 添加设备预约
        for res in device_reservations:
            data.append({
                '预约类型': '设备预约',
                '申请人': res.user.name,
                '学院': res.user.department,
                '设备名称': res.device_name,
                '借用时间': res.borrow_time.strftime('%Y-%m-%d %H:%M'),
                '归还时间': res.return_time.strftime('%Y-%m-%d %H:%M') if res.return_time else '',
                '状态': res.status,
                '创建时间': res.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        # 添加打印机预约
        for res in printer_reservations:
            data.append({
                '预约类型': '打印机预约',
                '申请人': res.user.name,
                '学院': res.user.department,
                '打印机': res.printer_name,
                '预约日期': res.reservation_date.strftime('%Y-%m-%d'),
                '打印时间': res.print_time.strftime('%H:%M') if res.print_time else '',
                '状态': res.status,
                '创建时间': res.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })

        # 创建Excel文件
        df = pd.DataFrame(data)
        
        # 创建一个临时文件
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        output.seek(0)
        
        # 返回文件
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': f'attachment; filename=预约记录_{datetime.now().strftime("%Y%m%d")}.xlsx'
            }
        )
    except Exception as e:
        print(f"Error exporting reservations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出预约记录失败: {str(e)}"
        )

@router.post("/reservations/batch-approve")
async def batch_approve_reservations(
    reservation_type: str,  # 从查询参数获取
    data: dict,  # 从请求体获取
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """批量审批预约"""
    if "reservation_ids" not in data or not isinstance(data["reservation_ids"], list):
        raise HTTPException(status_code=400, detail="Invalid reservation_ids")
    
    if "action" not in data or data["action"] not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    model_map = {
        "venue": models.VenueReservation,
        "device": models.DeviceReservation,
        "printer": models.PrinterReservation
    }
    
    if reservation_type not in model_map:
        raise HTTPException(status_code=400, detail="Invalid reservation type")
    
    model = model_map[reservation_type]
    status = "approved" if data["action"] == "approve" else "rejected"
    
    try:
        db.query(model).filter(
            model.reservation_id.in_(data["reservation_ids"])
        ).update(
            {"status": status},
            synchronize_session=False
        )
        db.commit()
        return {"message": "Successfully updated reservations"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/user-import")
async def get_user_import_template():
    """获取用户导入模板"""
    try:
        # 创建示例数据
        df = pd.DataFrame({
            'username': ['2021001', '2021002', 'T2021001'],  # 学号/工号
            'name': ['张三', '李四', '王老师'],  # 姓名
            'department': ['计算机学院', '机械学院', '计算机学院'],  # 学院
            'role': ['student', 'student', 'teacher'],  # 角色
            'password': ['123456', '123456', '123456']  # 初始密码
        })
        
        # 创建一个临时文件
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        output.seek(0)
        
        headers = {
            'Content-Disposition': 'attachment; filename=user_import_template.xlsx',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers=headers
        )
    except Exception as e:
        print(f"Error creating template: {str(e)}")  # 添加调试信息
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建模板失败: {str(e)}"
        )

@router.get("/users")
async def get_users(db: Session = Depends(get_db)):
    """获取所有用户"""
    try:
        users = db.query(models.User).all()
        result = []
        for user in users:
            result.append({
                "username": user.username,
                "name": user.name,
                "department": user.department,
                "role": user.role
                # 暂时移除 created_at 字段
            })
        print(f"Found {len(result)} users")  # 调试信息
        return result
    except Exception as e:
        print(f"Error getting users: {str(e)}")  # 调试信息
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取用户列表失败: {str(e)}"
        )

@router.post("/users/import")
async def import_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """导入用户"""
    try:
        # 读取Excel文件
        contents = await file.read()
        df = pd.read_excel(contents)
        print(f"Read Excel file with {len(df)} rows")  # 调试信息
        
        # 验证数据格式
        required_columns = ['username', 'name', 'department', 'role', 'password']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"文件格式不正确，缺少以下列：{', '.join(missing_columns)}"
            )
        
        # 处理导入的用户数据
        success_count = 0
        error_messages = []
        
        for _, row in df.iterrows():
            try:
                # 检查用户是否已存在
                existing_user = db.query(models.User).filter(
                    models.User.username == row['username']
                ).first()
                
                if existing_user:
                    error_messages.append(f"用户 {row['username']} 已存在")
                    continue
                
                # 创建新用户
                hashed_password = get_password_hash(str(row['password']))
                user = models.User(
                    username=row['username'],
                    name=row['name'],
                    department=row['department'],
                    role=row['role'],
                    password=hashed_password
                )
                db.add(user)
                success_count += 1
                print(f"Added user: {row['username']}")  # 调试信息
            except Exception as e:
                error_msg = f"添加用户 {row['username']} 失败: {str(e)}"
                print(error_msg)  # 调试信息
                error_messages.append(error_msg)
        
        if success_count > 0:
            db.commit()
            
        result = {
            "message": "用户导入完成",
            "success_count": success_count,
            "error_messages": error_messages
        }
        
        if not success_count and error_messages:
            raise HTTPException(status_code=400, detail=result)
            
        return result
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error importing users: {str(e)}")  # 调试信息
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导入用户失败: {str(e)}"
        )

@router.delete("/users/{username}")
async def delete_user(
    username: str,
    db: Session = Depends(get_db)
):
    """删除用户"""
    try:
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        db.delete(user)
        db.commit()
        return {"message": "用户删除成功"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reservations/list")
async def list_reservations(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取预约记录列表"""
    try:
        # 先检查数据库中是否有数据
        total_venues = db.query(models.VenueReservation).count()
        total_devices = db.query(models.DeviceReservation).count()
        total_printers = db.query(models.PrinterReservation).count()
        print(f"Database counts - Venues: {total_venues}, Devices: {total_devices}, Printers: {total_printers}")
        
        # 查询所有类型的预约
        venue_reservations = db.query(models.VenueReservation).join(
            models.User
        ).options(
            joinedload(models.VenueReservation.user)
        )
        
        device_reservations = db.query(models.DeviceReservation).join(
            models.User
        ).options(
            joinedload(models.DeviceReservation.user)
        )
        
        printer_reservations = db.query(models.PrinterReservation).join(
            models.User
        ).options(
            joinedload(models.PrinterReservation.user)
        )

        # 添加日期过滤
        if start_date:
            venue_reservations = venue_reservations.filter(models.VenueReservation.reservation_date >= start_date)
            device_reservations = device_reservations.filter(models.DeviceReservation.borrow_time >= start_date)
            printer_reservations = printer_reservations.filter(models.PrinterReservation.reservation_date >= start_date)
        
        if end_date:
            venue_reservations = venue_reservations.filter(models.VenueReservation.reservation_date <= end_date)
            device_reservations = device_reservations.filter(models.DeviceReservation.borrow_time <= end_date)
            printer_reservations = printer_reservations.filter(models.PrinterReservation.reservation_date <= end_date)

        # 执行查询
        venue_reservations = venue_reservations.all()
        device_reservations = device_reservations.all()
        printer_reservations = printer_reservations.all()

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
                "status": res.status,
                "user": {
                    "name": res.user.name,
                    "department": res.user.department
                }
            })
        
        # 添加设备预约
        for res in device_reservations:
            result.append({
                "type": "device",
                "reservation_id": res.reservation_id,
                "device_name": res.device_name,
                "borrow_time": res.borrow_time.strftime('%Y-%m-%d %H:%M'),
                "return_time": res.return_time.strftime('%Y-%m-%d %H:%M') if res.return_time else None,
                "status": res.status,
                "user": {
                    "name": res.user.name,
                    "department": res.user.department
                }
            })
        
        # 添加打印机预约
        for res in printer_reservations:
            result.append({
                "type": "printer",
                "reservation_id": res.reservation_id,
                "printer_name": res.printer_name,
                "reservation_date": res.reservation_date.strftime('%Y-%m-%d'),
                "print_time": res.print_time.strftime('%H:%M') if res.print_time else None,
                "status": res.status,
                "user": {
                    "name": res.user.name,
                    "department": res.user.department
                }
            })
        
        # 按日期排序
        result.sort(key=lambda x: x.get('reservation_date') or x.get('borrow_time'), reverse=True)
        
        print(f"Found {len(result)} total reservations")
        return result
        
    except Exception as e:
        print(f"Error getting reservations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取预约记录失败: {str(e)}"
        )

@router.post("/devices", response_model=Device)
async def add_device(device: DeviceCreate, db: Session = Depends(get_db)):
    """添加新设备"""
    db_device = models.Management(**device.dict())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.put("/devices/{device_id}", response_model=Device)
async def update_device(
    device_id: int,
    device: DeviceUpdate,
    db: Session = Depends(get_db)
):
    """更新设备信息"""
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