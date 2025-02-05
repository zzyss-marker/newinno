import requests
from datetime import datetime, timedelta
import json
import pandas as pd
import io
import time

class ReservationSystemTester:
    def __init__(self):
        self.base_url = "http://127.0.0.1:8001/api"
        self.token = None
        self.headers = None
        self.test_data = {}

    def setup(self):
        """初始化测试数据"""
        print("\n=== 初始化测试数据 ===")
        self.test_data = {
            "admin": {
                "username": "A001",
                "password": "123456",
                "role": "admin"
            },
            "student": {
                "username": "201900001",
                "name": "张三",
                "password": "123456",
                "department": "计算机学院",
                "role": "student"
            },
            "teacher": {
                "username": "T001",
                "name": "李四",
                "password": "123456",
                "department": "计算机学院",
                "role": "teacher"
            }
        }

    def login(self, user_type):
        """用户登录"""
        print(f"\n=== 测试登录 ({user_type}) ===")
        user = self.test_data[user_type]
        response = requests.post(
            f"{self.base_url}/token",
            data={
                "username": user["username"],
                "password": user["password"],
                "grant_type": "password"
            }
        )
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
            print("登录成功")
            return True
        print(f"登录失败: {response.text}")
        return False

    def test_user_management(self):
        """测试用户管理功能"""
        print("\n=== 测试用户管理 ===")
        
        # 创建Excel文件
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

        # 导入用户
        files = {"file": ("users.xlsx", excel_buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        response = requests.post(
            f"{self.base_url}/users/import",
            headers=self.headers,
            files=files
        )
        print(f"导入用户状态码: {response.status_code}")
        print(f"响应: {response.text}")

        # 等待一下确保用户创建完成
        time.sleep(1)

    def test_venue_reservation(self):
        """测试场地预约功能"""
        print("\n=== 测试场地预约 ===")
        
        future_date = (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%d")
        data = {
            "venue_type": "讲座",
            "reservation_date": future_date,
            "business_time": "上午",
            "purpose": "测试讲座",
            "devices_needed": {
                "screen": True,
                "laptop": True,
                "mic_handheld": True,
                "mic_gooseneck": False,
                "projector": True
            }
        }
        try:
            response = requests.post(
                f"{self.base_url}/reservations/venue",
                headers=self.headers,
                json=data
            )
            print(f"创建预约状态码: {response.status_code}")
            print(f"响应: {response.text}")
            
            if response.status_code == 200:
                self.test_data["venue_id"] = response.json()["reservation_id"]
        except Exception as e:
            print(f"预约失败: {str(e)}")

    def test_device_reservation(self):
        """测试设备预约功能"""
        print("\n=== 测试设备预约 ===")
        
        data = {
            "device_name": "electric_screwdriver",
            "borrow_time": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "return_time": (datetime.now() + timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%S"),
            "reason": "测试使用"
        }
        response = requests.post(
            f"{self.base_url}/reservations/device",
            headers=self.headers,
            json=data
        )
        print(f"创建预约状态码: {response.status_code}")
        print(f"响应: {response.text}")
        
        if response.status_code == 200:
            self.test_data["device_id"] = response.json()["reservation_id"]

    def test_printer_reservation(self):
        """测试3D打印机预约功能"""
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
        print(f"创建预约状态码: {response.status_code}")
        print(f"响应: {response.text}")
        
        if response.status_code == 200:
            self.test_data["printer_id"] = response.json()["reservation_id"]

    def test_admin_functions(self):
        """测试管理员功能"""
        print("\n=== 测试管理员功能 ===")
        
        # 查看待审批预约
        response = requests.get(
            f"{self.base_url}/admin/reservations/pending",
            headers=self.headers
        )
        print(f"查看待审批状态码: {response.status_code}")
        print(f"响应: {response.text}")

        # 批量审批
        if "venue_id" in self.test_data:
            data = {
                "reservation_ids": [self.test_data["venue_id"]],
                "action": "approve"
            }
            response = requests.post(
                f"{self.base_url}/admin/reservations/batch-approve?reservation_type=venue",
                headers=self.headers,
                json=data
            )
            print(f"批量审批状态码: {response.status_code}")
            print(f"响应: {response.text}")

        # 确认设备归还
        if "device_id" in self.test_data:
            response = requests.put(
                f"{self.base_url}/admin/device-return/{self.test_data['device_id']}",
                headers=self.headers
            )
            print(f"确认归还状态码: {response.status_code}")
            print(f"响应: {response.text}")

        # 导出预约记录
        response = requests.get(
            f"{self.base_url}/admin/export-reservations",
            headers=self.headers
        )
        print(f"导出记录状态码: {response.status_code}")
        if response.status_code == 200:
            with open("test_export.xlsx", "wb") as f:
                f.write(response.content)
            print("导出文件已保存为 test_export.xlsx")

    def test_device_management(self):
        """测试设备管理功能"""
        print("\n=== 测试设备管理 ===")
        
        # 添加新设备
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
        print(f"响应: {response.text}")

        # 查看设备状态
        response = requests.get(
            f"{self.base_url}/management/devices/status",
            headers=self.headers
        )
        print(f"查看状态码: {response.status_code}")
        print(f"响应: {response.text}")

    def test_history_queries(self):
        """测试历史记录查询功能"""
        print("\n=== 测试历史记录查询 ===")
        
        # 查询设备历史
        response = requests.get(
            f"{self.base_url}/management/devices/electric_screwdriver/history",
            headers=self.headers
        )
        print(f"设备历史查询状态码: {response.status_code}")
        print(f"响应: {response.text}")

        # 查询用户借用历史
        response = requests.get(
            f"{self.base_url}/management/users/201900001/borrow-history",
            headers=self.headers
        )
        print(f"用户历史查询状态码: {response.status_code}")
        print(f"响应: {response.text}")

    def test_error_cases(self):
        """测试异常情况"""
        print("\n=== 测试异常情况 ===")
        
        # 1. 测试提前预约时间限制
        print("测试场地预约时间限制...")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        data = {
            "venue_type": "lecture",
            "reservation_date": tomorrow,
            "business_time": "morning",
            "purpose": "测试讲座",
            "devices_needed": {
                "screen": True,
                "laptop": True,
                "mic_handheld": True,
                "mic_gooseneck": False,
                "projector": True
            }
        }
        response = requests.post(
            f"{self.base_url}/reservations/venue",
            headers=self.headers,
            json=data
        )
        print(f"预期失败状态码: {response.status_code}")
        print(f"错误信息: {response.text}")

        # 2. 测试设备超量预约
        print("\n测试设备超量预约...")
        data = {
            "device_or_venue_name": "测试设备",
            "category": "device",
            "quantity": 1,
            "available_quantity": 0,
            "status": "available"
        }
        response = requests.post(
            f"{self.base_url}/management/devices",
            headers=self.headers,
            json=data
        )
        if response.status_code == 200:
            device_data = {
                "device_name": "测试设备",
                "borrow_time": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                "return_time": (datetime.now() + timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%S"),
                "reason": "测试使用"
            }
            response = requests.post(
                f"{self.base_url}/reservations/device",
                headers=self.headers,
                json=device_data
            )
            print(f"预期失败状态码: {response.status_code}")
            print(f"错误信息: {response.text}")

        # 3. 测试无权限访问
        print("\n测试无权限访问...")
        response = requests.get(
            f"{self.base_url}/admin/reservations/pending",
            headers={"Authorization": "Bearer invalid_token"}
        )
        print(f"预期失败状态码: {response.status_code}")
        print(f"错误信息: {response.text}")

    def test_concurrent_reservations(self):
        """测试并发预约"""
        print("\n=== 测试并发预约 ===")
        import threading
        import time

        def make_reservation(device_name, delay):
            time.sleep(delay)  # 模拟不同用户同时操作
            data = {
                "device_name": device_name,
                "borrow_time": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                "return_time": (datetime.now() + timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%S"),
                "reason": f"并发测试 {threading.current_thread().name}"
            }
            response = requests.post(
                f"{self.base_url}/reservations/device",
                headers=self.headers,
                json=data
            )
            print(f"线程 {threading.current_thread().name} 状态码: {response.status_code}")
            if response.status_code == 200:
                print(f"预约成功: {response.json()}")
            else:
                print(f"预约失败: {response.text}")

        # 创建多个线程同时预约
        threads = []
        for i in range(5):
            t = threading.Thread(
                target=make_reservation,
                args=("electric_screwdriver", i * 0.1)
            )
            threads.append(t)
            t.start()

        # 等待所有线程完成
        for t in threads:
            t.join()

    def test_data_validation(self):
        """测试数据验证"""
        print("\n=== 测试数据验证 ===")
        
        # 1. 测试无效的日期格式
        print("测试无效日期格式...")
        data = {
            "venue_type": "lecture",
            "reservation_date": "invalid_date",
            "business_time": "morning",
            "purpose": "测试讲座",
            "devices_needed": {
                "screen": True
            }
        }
        response = requests.post(
            f"{self.base_url}/reservations/venue",
            headers=self.headers,
            json=data
        )
        print(f"预期失败状态码: {response.status_code}")
        print(f"错误信息: {response.text}")

        # 2. 测试缺少必填字段
        print("\n测试缺少必填字段...")
        data = {
            "venue_type": "lecture",
            "business_time": "morning"
            # 缺少 reservation_date 和 purpose
        }
        response = requests.post(
            f"{self.base_url}/reservations/venue",
            headers=self.headers,
            json=data
        )
        print(f"预期失败状态码: {response.status_code}")
        print(f"错误信息: {response.text}")

        # 3. 测试无效的枚举值
        print("\n测试无效枚举值...")
        data = {
            "venue_type": "invalid_type",
            "reservation_date": (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%d"),
            "business_time": "invalid_time",
            "purpose": "测试",
            "devices_needed": {
                "screen": True
            }
        }
        response = requests.post(
            f"{self.base_url}/reservations/venue",
            headers=self.headers,
            json=data
        )
        print(f"预期失败状态码: {response.status_code}")
        print(f"错误信息: {response.text}")

def run_all_tests():
    tester = ReservationSystemTester()
    tester.setup()

    # 1. 管理员功能测试
    if tester.login("admin"):
        tester.test_user_management()
        tester.test_device_management()
        tester.test_admin_functions()
        tester.test_history_queries()

    # 2. 学生功能测试
    if tester.login("student"):
        tester.test_venue_reservation()
        tester.test_device_reservation()
        tester.test_printer_reservation()

    # 3. 再次使用管理员账号测试审批
    if tester.login("admin"):
        tester.test_admin_functions()

if __name__ == "__main__":
    run_all_tests() 