import pymysql
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

def check_device_reservations():
    """检查MySQL数据库中的设备预约记录"""
    try:
        # 获取MySQL连接参数
        MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
        MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
        MYSQL_USER = os.getenv("MYSQL_USER", "root")
        MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "your_mysql_password")
        MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "reservation_system")

        print(f"连接MySQL数据库: {MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}")

        # 连接MySQL数据库
        conn = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            charset='utf8mb4'
        )

        cursor = conn.cursor()

        # 查询所有设备预约记录
        cursor.execute("""
            SELECT
                reservation_id,
                user_id,
                device_name,
                borrow_time,
                return_time,
                reason,
                status,
                created_at,
                usage_type,
                teacher_name
            FROM device_reservations
            ORDER BY created_at DESC
        """)

        records = cursor.fetchall()

        print("=== 设备预约记录查询结果 ===")
        print(f"总共找到 {len(records)} 条设备预约记录")
        print()

        if records:
            for record in records:
                print(f"预约ID: {record[0]}")
                print(f"用户ID: {record[1]}")
                print(f"设备名称: {record[2]}")
                print(f"借用时间: {record[3]}")
                print(f"归还时间: {record[4]}")
                print(f"用途说明: {record[5]}")
                print(f"状态: {record[6]}")
                print(f"创建时间: {record[7]}")
                print(f"使用类型: {record[8]}")
                print(f"指导老师: {record[9]}")
                print("-" * 50)
        else:
            print("没有找到任何设备预约记录")

        # 查询用户信息
        cursor.execute("SELECT user_id, username, name FROM users")
        users = cursor.fetchall()
        print("\n=== 用户信息 ===")
        for user in users:
            print(f"用户ID: {user[0]}, 用户名: {user[1]}, 姓名: {user[2]}")

        # 检查表结构
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"\n=== 数据库表列表 ===")
        for table in tables:
            print(f"表名: {table[0]}")

        conn.close()

    except Exception as e:
        print(f"查询失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_device_reservations()
