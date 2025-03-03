from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 获取项目根目录
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 使用正确的数据库路径
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'admin_system', 'instance', 'admin.db')}"

print(f"Using database at: {SQLALCHEMY_DATABASE_URL}")  # 调试用，确认数据库路径

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# 验证数据库连接和表的存在
def verify_db():
    try:
        # 尝试连接数据库
        conn = engine.connect()
        # 检查表是否存在
        result = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='management'")
        tables = result.fetchall()
        conn.close()
        
        if not tables:
            print("Warning: 'management' table not found in database")
        else:
            print("Successfully connected to database and found management table")
            
    except Exception as e:
        print(f"Error connecting to database: {str(e)}")
        raise e

# 验证数据库
verify_db()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 获取admin_system数据库会话
def get_admin_system_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 