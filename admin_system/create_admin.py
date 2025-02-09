import os
from app import create_app, db
from app.models import Admin

def create_admin():
    """创建管理员账号"""
    print("开始创建管理员账号...")
    
    # 删除旧的数据库文件（如果存在）
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'admin.db')
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"已删除旧数据库: {db_path}")
    
    # 创建应用上下文
    app = create_app()
    
    with app.app_context():
        # 删除所有表并重新创建
        print("正在创建数据库表...")
        db.drop_all()  # 删除所有现有表
        db.create_all()  # 创建新表
        
        try:
            # 创建新管理员账号
            admin = Admin(
                username='admin',
                name='超级管理员'
            )
            admin.set_password('admin123')  # 设置初始密码
            
            db.session.add(admin)
            db.session.commit()
            print("管理员账号创建成功！")
            print("用户名: admin")
            print("密码: admin123")
            
        except Exception as e:
            print(f"创建管理员账号时出错: {str(e)}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    create_admin() 