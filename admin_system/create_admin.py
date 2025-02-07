import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import db, models
from werkzeug.security import generate_password_hash

def create_admin():
    """创建后台管理员账号"""
    admin = models.Admin(
        username="admin",
        password_hash=generate_password_hash("admin123"),
        is_super_admin=True
    )
    db.session.add(admin)
    db.session.commit()

if __name__ == "__main__":
    create_admin()

if __name__ == '__main__':
    # 删除旧的数据库文件（如果存在）
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'admin.db')
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Removed old database: {db_path}") 