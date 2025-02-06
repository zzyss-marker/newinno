from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import Base, User, UserRole
from passlib.context import CryptContext

# 创建密码哈希工具
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 数据库连接
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 添加密码验证函数
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_test_accounts():
    # 创建数据库表
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 清除已有的测试用户
        db.query(User).filter(User.username.in_(['2021001', 'admin001'])).delete(synchronize_session=False)
        
        # 创建学生测试账号
        student = User(
            username="2021001",  # 学号作为用户名
            password=pwd_context.hash("123456"),  # 使用相同的加密方式
            name="张三",
            department="计算机学院",
            role=UserRole.student
        )
        
        # 创建审批员测试账号
        admin = User(
            username="admin001",  # 管理员账号
            password=pwd_context.hash("admin123"),  # 密码: admin123
            name="李主任",
            department="创新实验室",
            role=UserRole.admin
        )
        
        # 添加到数据库
        db.add(student)
        db.add(admin)
        db.commit()
        
        # 验证账号是否创建成功
        student_check = db.query(User).filter(User.username == "2021001").first()
        admin_check = db.query(User).filter(User.username == "admin001").first()
        
        if student_check and admin_check:
            print("测试账号创建成功！")
            print("学生账号 - 用户名: 2021001, 密码: 123456")
            print("管理员账号 - 用户名: admin001, 密码: admin123")
            # 验证密码是否正确
            print("验证学生密码:", verify_password("123456", student_check.password))
            print("验证管理员密码:", verify_password("admin123", admin_check.password))
        else:
            print("账号创建失败！")
        
    except Exception as e:
        print(f"创建测试账号失败: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_accounts() 