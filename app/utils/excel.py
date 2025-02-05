import pandas as pd
from typing import List, Dict
from datetime import datetime
from ..models.models import VenueReservation, DeviceReservation, PrinterReservation
import io
import bcrypt

def read_users_excel(file) -> List[Dict]:
    df = pd.read_excel(file)
    users = []
    
    for _, row in df.iterrows():
        username = str(row["学号/工号"])
        password = str(row["身份证号后6位"])
        user = {
            "username": username,
            "name": str(row["姓名"]),
            "department": str(row["学院"]),
            "password": bcrypt.hashpw(
                password.encode('utf-8'), 
                bcrypt.gensalt()
            ).decode('utf-8'),
            "role": "student" if len(username) > 6 else "teacher"
        }
        users.append(user)
    
    return users

def format_reservation_status(status: str) -> str:
    """格式化预约状态为中文"""
    status_map = {
        "pending": "待审批",
        "approved": "已通过",
        "rejected": "已拒绝",
        "returned": "已归还"
    }
    return status_map.get(status, status)

def format_device_name(name: str) -> str:
    """格式化设备名称为中文"""
    device_map = {
        "electric_screwdriver": "电动螺丝刀",
        "multimeter": "万用表",
        "printer_1": "3D打印机1号",
        "printer_2": "3D打印机2号",
        "printer_3": "3D打印机3号"
    }
    return device_map.get(name, name)

def export_reservations_excel(
    venue_reservations: List[VenueReservation],
    device_reservations: List[DeviceReservation],
    printer_reservations: List[PrinterReservation]
) -> bytes:
    # 场地预约数据
    venue_data = []
    for res in venue_reservations:
        # 转换设备需求为中文
        devices = []
        if res.devices_needed.get("screen"):
            devices.append("大屏")
        if res.devices_needed.get("laptop"):
            devices.append("笔记本")
        if res.devices_needed.get("mic_handheld"):
            devices.append("手持麦")
        if res.devices_needed.get("mic_gooseneck"):
            devices.append("鹅颈麦")
        if res.devices_needed.get("projector"):
            devices.append("投屏器")
        
        venue_data.append({
            "预约类型": "场地预约",
            "场地类型": res.venue_type,
            "预约日期": res.reservation_date.strftime("%Y年%m月%d日"),
            "时间段": res.business_time,
            "用途": res.purpose,
            "设备需求": "、".join(devices) if devices else "无",
            "预约人": f"{res.user.name}({res.user.username})",
            "所属部门": res.user.department,
            "状态": format_reservation_status(res.status)
        })
    
    # 设备预约数据
    device_data = []
    for res in device_reservations:
        device_data.append({
            "预约类型": "设备预约",
            "设备名称": format_device_name(res.device_name),
            "借用时间": res.borrow_time.strftime("%Y年%m月%d日 %H:%M"),
            "预计归还时间": res.return_time.strftime("%Y年%m月%d日 %H:%M"),
            "实际归还时间": res.actual_return_time.strftime("%Y年%m月%d日 %H:%M") if res.actual_return_time else "未归还",
            "借用原因": res.reason,
            "预约人": f"{res.user.name}({res.user.username})",
            "所属部门": res.user.department,
            "状态": format_reservation_status(res.status)
        })
    
    # 3D打印机预约数据
    printer_data = []
    for res in printer_reservations:
        printer_data.append({
            "预约类型": "3D打印机预约",
            "打印机": format_device_name(res.printer_name),
            "预约日期": res.reservation_date.strftime("%Y年%m月%d日"),
            "打印时间": res.print_time.strftime("%H:%M"),
            "预约人": f"{res.user.name}({res.user.username})",
            "所属部门": res.user.department,
            "状态": format_reservation_status(res.status)
        })
    
    # 创建Excel文件
    with pd.ExcelWriter(io.BytesIO()) as writer:
        pd.DataFrame(venue_data).to_excel(writer, sheet_name="场地预约", index=False)
        pd.DataFrame(device_data).to_excel(writer, sheet_name="设备预约", index=False)
        pd.DataFrame(printer_data).to_excel(writer, sheet_name="3D打印机预约", index=False)
        
        writer.save()
        excel_file = writer.handles.handle.getvalue()
    
    return excel_file 