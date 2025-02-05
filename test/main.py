import requests
from datetime import datetime, timedelta
import json
import pandas as pd
import io

class ReservationSystemTest:
    def __init__(self):
        self.base_url = "http://127.0.0.1:8001/api"
        self.token = None
        self.headers = None
        self.venue_id = None
        self.device_id = None
        self.printer_id = None

    def setup_test_data(self):
        """创建测试用Excel文件"""
        data = {
            "学号/工号": ["201900001", "T001"],
            "姓名": ["张三", "李四"],
            "学院": ["计算机学院", "计算机学院"],
            "身份证号后6位": ["123456", "123456"]
        }
        df = pd.DataFrame(data)
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False)
        excel_buffer.seek(0)
        return excel_buffer

    def login(self, username, password):
        """用户登录"""
        print(f"\n=== 测试登录 ({username}) ===")
        try:
            response = requests.post(
                f"{self.base_url}/token",
                data={
                    "username": username,
                    "password": password,
                    "grant_type": "password"
                }
            )
            print(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    print(f"响应: {response_data}")
                    self.token = response_data["access_token"]
                    self.headers = {"Authorization": f"Bearer {self.token}"}
                    return True
                except json.JSONDecodeError as e:
                    print(f"JSON解析错误: {e}")
                    return False
            else:
                try:
                    print(f"错误响应: {response.text}")
                except:
                    print("无法读取错误响应")
                return False
            
        except requests.exceptions.RequestException as e:
            print(f"请求错误: {e}")
            return False

    def import_users(self, excel_file):
        """导入用户（管理员功能）"""
        print("\n=== 测试导入用户 ===")
        files = {"file": ("users.xlsx", excel_file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        response = requests.post(
            f"{self.base_url}/users/import",
            headers=self.headers,
            files=files
        )
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            print(f"响应: {response.json()}")
            return True
        else:
            print(f"错误响应: {response.text}")
            return False

    def create_venue_reservation(self):
        """创建场地预约"""
        print("\n=== 测试场地预约 ===")
        future_date = (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%d")
        data = {
            "venue_type": "lecture",
            "reservation_date": future_date,
            "business_time": "morning",  # 可选 morning, afternoon, evening
            "purpose": "测试讲座",
            "devices_needed": {
                "screen": True,      # 大屏
                "laptop": True,      # 笔记本
                "mic_handheld": True,  # 手持麦
                "mic_gooseneck": False, # 鹅颈麦
                "projector": True    # 投屏器
            }
        }
        response = requests.post(
            f"{self.base_url}/reservations/venue",
            headers=self.headers,
            json=data
        )
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            response_data = response.json()
            print(f"响应: {response_data}")
            self.venue_id = response_data.get("reservation_id")
            return self.venue_id
        else:
            print(f"错误响应: {response.text}")
            return None

    def create_device_reservation(self):
        """创建设备预约"""
        print("\n=== 测试设备预约 ===")
        current_time = datetime.now()
        data = {
            "device_name": "electric_screwdriver",
            "borrow_time": current_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "return_time": (current_time + timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%S"),
            "reason": "测试使用"
        }
        response = requests.post(
            f"{self.base_url}/reservations/device",
            headers=self.headers,
            json=data
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        self.device_id = response.json().get("reservation_id")
        return self.device_id

    def create_printer_reservation(self):
        """创建3D打印机预约"""
        print("\n=== 测试3D打印机预约 ===")
        tomorrow = datetime.now() + timedelta(days=2)
        data = {
            "printer_name": "printer_1",
            "reservation_date": tomorrow.strftime("%Y-%m-%d"),
            "print_time": tomorrow.strftime("%Y-%m-%dT10:00:00")
        }
        response = requests.post(
            f"{self.base_url}/reservations/printer",
            headers=self.headers,
            json=data
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        self.printer_id = response.json().get("reservation_id")
        return self.printer_id

    def get_my_reservations(self):
        """查看我的预约"""
        print("\n=== 测试查看我的预约 ===")
        response = requests.get(
            f"{self.base_url}/reservations/my-reservations",
            headers=self.headers
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")

    def approve_reservation(self, reservation_type, reservation_id):
        """审批预约（管理员功能）"""
        print(f"\n=== 测试审批预约 ({reservation_type}) ===")
        response = requests.put(
            f"{self.base_url}/admin/reservations/{reservation_type}/{reservation_id}/approve",
            headers=self.headers
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")

    def confirm_device_return(self, reservation_id):
        """确认设备归还（管理员功能）"""
        print("\n=== 测试确认设备归还 ===")
        response = requests.put(
            f"{self.base_url}/admin/device-return/{reservation_id}",
            headers=self.headers
        )
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")

    def export_reservations(self):
        """导出预约记录（管理员功能）"""
        print("\n=== 测试导出预约记录 ===")
        response = requests.get(
            f"{self.base_url}/admin/export-reservations",
            headers=self.headers
        )
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            with open("reservations_export.xlsx", "wb") as f:
                f.write(response.content)
            print("预约记录已导出到 reservations_export.xlsx")

    def test_device_management(self):
        """测试设备管理功能"""
        print("\n=== 测试设备管理 ===")
        
        # 添加设备
        data = {
            "device_or_venue_name": "新电动螺丝刀",
            "category": "device",
            "quantity": 5,
            "available_quantity": 5,
            "status": "available"
        }
        response = requests.post(
            f"{self.base_url}/management/devices",
            headers=self.headers,
            json=data
        )
        print(f"添加设备状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        # 获取设备状态
        response = requests.get(
            f"{self.base_url}/management/devices/status",
            headers=self.headers,
            params={"category": "device"}
        )
        print(f"获取设备状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        # 获取预约统计
        response = requests.get(
            f"{self.base_url}/management/reservations/stats",
            headers=self.headers
        )
        print(f"获取统计状态码: {response.status_code}")
        print(f"响应: {response.json()}")

def run_tests():
    tester = ReservationSystemTest()
    
    # 1. 先用管理员账号登录并导入用户
    if tester.login("A001", "123456"):
        excel_file = tester.setup_test_data()
        if not tester.import_users(excel_file):
            print("导入用户失败，测试终止")
            return
    else:
        print("管理员登录失败，测试终止")
        return
    
    # 2. 用学生账号测试预约功能
    if tester.login("201900001", "123456"):
        tester.create_venue_reservation()
        tester.create_device_reservation()
        tester.create_printer_reservation()
        tester.get_my_reservations()
    else:
        print("学生登录失败")
    
    # 3. 用管理员账号测试审批功能
    if tester.login("A001", "123456"):
        if tester.venue_id:
            tester.approve_reservation("venue", tester.venue_id)
        if tester.device_id:
            tester.approve_reservation("device", tester.device_id)
            tester.confirm_device_return(tester.device_id)
        if tester.printer_id:
            tester.approve_reservation("printer", tester.printer_id)
        tester.export_reservations()

    # 4. 测试设备管理功能
    tester.test_device_management()

if __name__ == "__main__":
    run_tests()