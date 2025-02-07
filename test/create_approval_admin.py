from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import User, Base
from app.utils.security import get_password_hash
from app.database import SQLALCHEMY_DATABASE_URL

def create_approval_admin():
    """创建审批管理员账号"""
    # 创建数据库连接
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # 检查是否已存在审批管理员
        admin = db.query(User).filter(
            User.username == "approval_admin"
        ).first()
        
        if not admin:
            # 创建审批管理员账号
            admin = User(
                username="1",
                name="审批管理员",
                password=get_password_hash("1"),  # 设置初始密码
                role="admin",
                department="管理部门"
            )
            db.add(admin)
            db.commit()
            print("审批管理员账号创建成功！")
            print("用户名: 1")
            print("密码: 1")
        else:
            print("审批管理员账号已存在")
            
    except Exception as e:
        print(f"创建审批管理员账号失败: {str(e)}")
        db.rollback()
    finally:
        db.close()

def change_approval_admin_password(new_password: str):
    """修改审批管理员密码"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        admin = db.query(User).filter(
            User.username == "approval_admin"
        ).first()
        
        if admin:
            admin.password = get_password_hash(new_password)
            db.commit()
            print("密码修改成功！")
        else:
            print("审批管理员账号不存在")
            
    except Exception as e:
        print(f"修改密码失败: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_approval_admin() 