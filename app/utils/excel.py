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
    """导出预约记录到Excel"""
    try:
        # 准备数据
        venue_data = []
        for res in venue_reservations:
            venue_data.append({
                "预约类型": "场地预约",
                "场地类型": str(res.venue_type),
                "预约日期": res.reservation_date.strftime("%Y-%m-%d"),
                "时间段": str(res.business_time),
                "用途": str(res.purpose),
                "预约人": f"{str(res.user.name)}({str(res.user.username)})",
                "所属部门": str(res.user.department),
                "状态": str(format_reservation_status(res.status))
            })
        
        device_data = []
        for res in device_reservations:
            device_data.append({
                "预约类型": "设备预约",
                "设备名称": str(format_device_name(res.device_name)),
                "借用时间": res.borrow_time.strftime("%Y-%m-%d %H:%M"),
                "预计归还时间": res.return_time.strftime("%Y-%m-%d %H:%M"),
                "实际归还时间": res.actual_return_time.strftime("%Y-%m-%d %H:%M") if res.actual_return_time else "未归还",
                "借用原因": str(res.reason),
                "预约人": f"{str(res.user.name)}({str(res.user.username)})",
                "所属部门": str(res.user.department),
                "状态": str(format_reservation_status(res.status))
            })
        
        printer_data = []
        for res in printer_reservations:
            printer_data.append({
                "预约类型": "3D打印机预约",
                "打印机": str(format_device_name(res.printer_name)),
                "预约日期": res.reservation_date.strftime("%Y-%m-%d"),
                "打印时间": res.print_time.strftime("%H:%M"),
                "预约人": f"{str(res.user.name)}({str(res.user.username)})",
                "所属部门": str(res.user.department),
                "状态": str(format_reservation_status(res.status))
            })

        # 创建DataFrame
        dfs = []
        if venue_data:
            dfs.append(("场地预约", pd.DataFrame(venue_data)))
        if device_data:
            dfs.append(("设备预约", pd.DataFrame(device_data)))
        if printer_data:
            dfs.append(("3D打印机预约", pd.DataFrame(printer_data)))

        # 使用openpyxl直接写入
        from openpyxl import Workbook
        wb = Workbook()
        
        # 删除默认的sheet
        wb.remove(wb.active)
        
        # 写入每个sheet
        for sheet_name, df in dfs:
            ws = wb.create_sheet(sheet_name)
            # 写入表头
            for col, header in enumerate(df.columns, 1):
                ws.cell(row=1, column=col, value=header)
            # 写入数据
            for row_idx, row in enumerate(df.values, 2):
                for col_idx, value in enumerate(row, 1):
                    ws.cell(row=row_idx, column=col_idx, value=value)

        # 保存到BytesIO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return output.getvalue()

    except Exception as e:
        print(f"Error in export_reservations_excel: {str(e)}")
        raise 