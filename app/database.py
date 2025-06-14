from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
import pymysql

load_dotenv()

# 使用MySQL数据库
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "123456")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "reservation_system")

def create_database_if_not_exists():
    """创建数据库（如果不存在）"""
    try:
        # 连接到MySQL服务器（不指定数据库）
        server_url = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}?charset=utf8mb4"
        server_engine = create_engine(server_url)

        with server_engine.connect() as conn:
            # 创建主数据库
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {MYSQL_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
            print(f"数据库 '{MYSQL_DATABASE}' 已确保存在")

            # 创建管理系统数据库
            admin_db = os.getenv("ADMIN_MYSQL_DATABASE", "admin_system")
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {admin_db} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
            print(f"数据库 '{admin_db}' 已确保存在")

            conn.commit()

        server_engine.dispose()
        return True
    except Exception as e:
        print(f"创建数据库时出错: {e}")
        return False

# 自动创建数据库
create_database_if_not_exists()

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"

# 创建数据库引擎
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=True,  # 启用SQL查询日志
    pool_pre_ping=True,  # 连接池预检查
    pool_recycle=3600,   # 连接回收时间
    pool_size=10,        # 连接池大小
    max_overflow=20      # 最大溢出连接数
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类
Base = declarative_base()

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 