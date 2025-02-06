from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime
from ..database import get_db
from ..models import models
from ..schemas import (  # 直接从schemas模块导入需要的类
    PendingReservations,
    ApprovedReservations,
    ReservationStatusUpdate
)
from ..utils.auth import get_current_admin
from ..utils.excel import read_users_excel, export_reservations_excel
import io
from fastapi.responses import StreamingResponse
from ..models.models import DeviceNames

router = APIRouter(prefix="/admin", tags=["admin"])

def convert_device_names(devices_needed: dict) -> dict:
    """将设备名称转换为中文"""
    if not devices_needed:
        return {}
    return {
        DeviceNames.from_str(k): v 
        for k, v in devices_needed.items()
    }

@router.get("/reservations/pending", response_model=PendingReservations)
async def get_pending_reservations(
    current_user: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # 获取待审批的预约
    venue_reservations = db.query(models.VenueReservation).filter(
        models.VenueReservation.status == 'pending'
    ).join(models.User).all()
    
    device_reservations = db.query(models.DeviceReservation).filter(
        models.DeviceReservation.status == 'pending'
    ).join(models.User).all()
    
    printer_reservations = db.query(models.PrinterReservation).filter(
        models.PrinterReservation.status == 'pending'
    ).join(models.User).all()

    # 转换为响应模型
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
            "devices_needed": convert_device_names(r.devices_needed) if isinstance(r.devices_needed, dict) else {}
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
            "reason": r.reason,
            "type": "device"
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

@router.get("/reservations/approved", response_model=ApprovedReservations)
async def get_approved_reservations(
    current_user: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
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
            "devices_needed": convert_device_names(r.devices_needed) if isinstance(r.devices_needed, dict) else {}
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

@router.post("/reservations/approve")
async def approve_reservation(
    data: ReservationStatusUpdate,  # 修改回使用 ReservationStatusUpdate schema
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """审批预约"""
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
            
        # 如果是打印机预约，检查时间冲突
        if data.type == "printer" and data.status == "approved":
            existing = db.query(models.PrinterReservation).filter(
                models.PrinterReservation.printer_name == reservation.printer_name,
                models.PrinterReservation.reservation_date == reservation.reservation_date,
                models.PrinterReservation.print_time == reservation.print_time,
                models.PrinterReservation.status == "approved",
                models.PrinterReservation.reservation_id != reservation.reservation_id
            ).first()
            
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="Time slot already approved for another reservation"
                )
        
        reservation.status = data.status
        db.commit()
        return {"message": f"Reservation {data.status}"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

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

@router.get("/export-reservations")
async def export_reservations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    venue_reservations = db.query(models.VenueReservation).all()
    device_reservations = db.query(models.DeviceReservation).all()
    printer_reservations = db.query(models.PrinterReservation).all()
    
    excel_file = export_reservations_excel(
        venue_reservations, 
        device_reservations, 
        printer_reservations
    )
    
    return StreamingResponse(
        io.BytesIO(excel_file),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=reservations.xlsx"}
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