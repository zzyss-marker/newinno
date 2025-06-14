from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

# 使用MySQL数据库配置
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "123456")
ADMIN_MYSQL_DATABASE = os.getenv("ADMIN_MYSQL_DATABASE", "admin_system")

def ensure_admin_database_exists():
    """确保管理系统数据库存在"""
    try:
        # 连接到MySQL服务器（不指定数据库）
        server_url = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}?charset=utf8mb4"
        server_engine = create_engine(server_url)

        with server_engine.connect() as conn:
            # 创建管理系统数据库
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {ADMIN_MYSQL_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
            print(f"管理系统数据库 '{ADMIN_MYSQL_DATABASE}' 已确保存在")
            conn.commit()

        server_engine.dispose()
        return True
    except Exception as e:
        print(f"创建管理系统数据库时出错: {e}")
        return False

# 确保数据库存在
ensure_admin_database_exists()

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{ADMIN_MYSQL_DATABASE}?charset=utf8mb4"

print(f"Using database at: {SQLALCHEMY_DATABASE_URL}")  # 调试用，确认数据库路径

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=5,
    max_overflow=10
)

# 验证数据库连接和表的存在
def verify_db():
    try:
        # 尝试连接数据库
        conn = engine.connect()
        # 检查表是否存在 (MySQL语法)
        result = conn.execute("SHOW TABLES LIKE 'management'")
        tables = result.fetchall()
        conn.close()

        if not tables:
            print("Warning: 'management' table not found in database, will be created automatically")
        else:
            print("Successfully connected to database and found management table")

    except Exception as e:
        print(f"Database connection info: {SQLALCHEMY_DATABASE_URL}")
        print(f"Error connecting to database: {str(e)}")
        print("Please run 'python create_databases.py' to create the required databases")
        # 不再抛出异常，让应用继续运行
        return False
    return True

# 验证数据库（不阻塞启动）
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