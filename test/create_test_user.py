import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# 添加项目根目录到 Python 路径
root_path = os.path.dirname(os.path.abspath(__file__))
sys.path.append(root_path)

# 导入模型
from app.models.models import User, Base
from app.database import SQLALCHEMY_DATABASE_URL

# 创建数据库连接
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 密码工具
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """获取密码的哈希值"""
    return pwd_context.hash(password)

def create_test_user():
    """创建测试用户"""
    db = SessionLocal()
    
    try:
        # 检查用户是否已存在
        existing_user = db.query(User).filter(User.username == "testuser").first()
        
        if existing_user:
            print(f"测试用户 'testuser' 已存在，无需创建")
            return
        
        # 创建新用户
        test_user = User(
            username="testuser",
            name="测试用户",
            department="测试部门",
            role="admin",  # 使用管理员权限以便能够创建预约
            password=get_password_hash("testpassword")
        )
        
        db.add(test_user)
        db.commit()
        
        print(f"测试用户创建成功:")
        print(f"  用户名: testuser")
        print(f"  密码: testpassword")
        print(f"  角色: admin")
        
    except Exception as e:
        db.rollback()
        print(f"创建测试用户失败: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
