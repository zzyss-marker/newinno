import requests
import random
import datetime
import time
import json
import argparse
from concurrent.futures import ThreadPoolExecutor
from tqdm import tqdm

# 配置参数
BASE_URL = "http://localhost:8001/api"  # FastAPI 后端服务地址
TOKEN = None  # 将在登录后设置
TOTAL_RESERVATIONS = 10000  # 默认创建10000条预约记录

# 场地类型选项
VENUE_TYPES = ["meeting_room", "activity_room", "classroom", "lecture_hall", "seminar_room"]
# 时间段选项
BUSINESS_TIMES = ["morning", "afternoon", "evening"]
# 设备名称选项
DEVICE_NAMES = ["electric_screwdriver", "multimeter"]
# 打印机名称选项
PRINTER_NAMES = ["printer_1", "printer_2", "printer_3"]
# 使用类型选项
USAGE_TYPES = ["onsite", "takeaway"]

# 登录并获取token
def login(username, password):
    url = f"{BASE_URL}/token"
    data = {
        "username": username,
        "password": password
    }

    try:
        response = requests.post(url, data=data)
        response.raise_for_status()
        token_data = response.json()
        return token_data.get("access_token")
    except requests.exceptions.RequestException as e:
        print(f"登录失败: {str(e)}")
        if hasattr(e, 'response') and e.response:
            print(f"响应内容: {e.response.text}")
        return None

# 创建场地预约
def create_venue_reservation():
    url = f"{BASE_URL}/reservations/venue"

    # 生成随机日期（未来30天内）
    future_days = random.randint(1, 30)
    reservation_date = (datetime.datetime.now() + datetime.timedelta(days=future_days)).strftime("%Y-%m-%d")

    # 构建请求数据
    data = {
        "venue_type": random.choice(VENUE_TYPES),
        "reservation_date": reservation_date,
        "business_time": random.choice(BUSINESS_TIMES),
        "purpose": f"测试用途 {random.randint(1, 1000)}",
        "devices_needed": {
            "screen": random.choice([True, False]),
            "laptop": random.choice([True, False]),
            "mic_handheld": random.choice([True, False]),
            "mic_gooseneck": random.choice([True, False]),
            "projector": random.choice([True, False])
        }
    }

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"创建场地预约失败: {str(e)}")
        if hasattr(e, 'response') and e.response:
            print(f"响应内容: {e.response.text}")
        return None

# 创建设备预约
def create_device_reservation():
    url = f"{BASE_URL}/reservations/device"

    # 生成随机日期时间（未来30天内）
    future_days = random.randint(1, 30)
    future_hours = random.randint(1, 23)
    borrow_time = (datetime.datetime.now() + datetime.timedelta(days=future_days, hours=future_hours))

    # 使用类型
    usage_type = random.choice(USAGE_TYPES)

    # 如果是带走使用，则需要归还时间
    return_time = None
    if usage_type == "takeaway":
        return_days = random.randint(1, 7)  # 1-7天后归还
        return_time = (borrow_time + datetime.timedelta(days=return_days)).strftime("%Y-%m-%dT%H:%M:%S")

    # 构建请求数据
    data = {
        "device_name": random.choice(DEVICE_NAMES),
        "borrow_time": borrow_time.strftime("%Y-%m-%dT%H:%M:%S"),
        "return_time": return_time,
        "reason": f"测试用途 {random.randint(1, 1000)}",
        "usage_type": usage_type,
        "teacher_name": f"测试老师 {random.randint(1, 10)}" if random.choice([True, False]) else None
    }

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"创建设备预约失败: {str(e)}")
        if hasattr(e, 'response') and e.response:
            print(f"响应内容: {e.response.text}")
        return None

# 创建打印机预约
def create_printer_reservation():
    url = f"{BASE_URL}/reservations/printer"

    # 生成随机日期（未来30天内）
    future_days = random.randint(1, 30)
    reservation_date = (datetime.datetime.now() + datetime.timedelta(days=future_days))

    # 生成开始时间和结束时间
    start_hour = random.randint(8, 16)  # 8:00 - 16:00
    duration_hours = random.randint(1, 4)  # 1-4小时

    print_time = reservation_date.replace(hour=start_hour, minute=0, second=0)
    end_time = print_time + datetime.timedelta(hours=duration_hours)

    # 构建请求数据
    data = {
        "printer_name": random.choice(PRINTER_NAMES),
        "reservation_date": reservation_date.strftime("%Y-%m-%d"),
        "print_time": print_time.strftime("%Y-%m-%dT%H:%M:%S"),
        "end_time": end_time.strftime("%Y-%m-%dT%H:%M:%S"),
        "estimated_duration": duration_hours * 60,  # 转换为分钟
        "model_name": f"测试模型 {random.randint(1, 100)}",
        "teacher_name": f"测试老师 {random.randint(1, 10)}" if random.choice([True, False]) else None
    }

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"创建打印机预约失败: {str(e)}")
        if hasattr(e, 'response') and e.response:
            print(f"响应内容: {e.response.text}")
        return None

# 随机创建一个预约（场地、设备或打印机）
def create_random_reservation():
    reservation_type = random.choice(["venue", "device", "printer"])

    if reservation_type == "venue":
        return create_venue_reservation()
    elif reservation_type == "device":
        return create_device_reservation()
    else:
        return create_printer_reservation()

# 主函数
def main():
    global TOKEN

    parser = argparse.ArgumentParser(description='批量创建预约记录测试脚本')
    parser.add_argument('--username', type=str, default='testuser', help='登录用户名')
    parser.add_argument('--password', type=str, default='testpassword', help='登录密码')
    parser.add_argument('--count', type=int, default=TOTAL_RESERVATIONS, help='创建预约的数量')
    parser.add_argument('--threads', type=int, default=10, help='并发线程数')
    args = parser.parse_args()

    # 登录获取token
    print(f"正在登录用户: {args.username}...")
    TOKEN = login(args.username, args.password)

    if not TOKEN:
        print("登录失败，无法继续测试")
        return

    print(f"登录成功，开始创建 {args.count} 条预约记录...")

    # 记录开始时间
    start_time = time.time()

    # 使用线程池并发创建预约
    success_count = 0
    failed_count = 0

    with ThreadPoolExecutor(max_workers=args.threads) as executor:
        # 使用tqdm显示进度条
        futures = [executor.submit(create_random_reservation) for _ in range(args.count)]

        for future in tqdm(futures, total=args.count, desc="创建预约"):
            result = future.result()
            if result:
                success_count += 1
            else:
                failed_count += 1

    # 计算总耗时
    elapsed_time = time.time() - start_time

    print(f"\n测试完成!")
    print(f"总预约数: {args.count}")
    print(f"成功: {success_count}")
    print(f"失败: {failed_count}")
    print(f"总耗时: {elapsed_time:.2f} 秒")
    print(f"平均每秒创建: {args.count / elapsed_time:.2f} 条预约")

if __name__ == "__main__":
    main()
