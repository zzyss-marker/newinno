from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from ..models import models
from ..schemas import schemas
from ..utils.auth import (
    verify_password, 
    create_access_token, 
    get_password_hash,
    get_current_admin,
    get_current_user
)
from ..utils.excel import read_users_excel
from typing import List, Optional
import io
import bcrypt
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime

router = APIRouter()

# 密码工具
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 配置
SECRET_KEY = "your-secret-key"  # 在生产环境中应该使用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        # 打印接收到的登录信息（密码不要打印）
        print(f"Login attempt for username: {form_data.username}")
        
        # 查找用户
        user = db.query(models.User).filter(models.User.username == form_data.username).first()
        if not user:
            print(f"User not found: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码错误"
            )
        
        # 验证密码 - 修改这里的密码验证逻辑
        if not pwd_context.verify(form_data.password, user.password):
            print(f"Invalid password for user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码错误"
            )
        
        # 生成token
        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        print(f"Login successful for user: {form_data.username}")
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise

@router.post("/users/import")
async def import_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    try:
        contents = await file.read()
        users_data = read_users_excel(io.BytesIO(contents))
        
        created_users = []
        skipped_users = []
        
        for user_data in users_data:
            # 检查用户是否已存在
            existing_user = db.query(models.User).filter(
                models.User.username == user_data["username"]
            ).first()
            
            if existing_user:
                skipped_users.append(user_data["username"])
                continue
                
            # 直接使用Excel中已经加密的密码
            db_user = models.User(**user_data)
            db.add(db_user)
            created_users.append(db_user)
        
        db.commit()
        
        if skipped_users:
            print(f"Skipped existing users: {', '.join(skipped_users)}")
            
        return created_users
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing users: {str(e)}"
        )

@router.get("/users/me", response_model=schemas.UserInfo)
async def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return {
        "id": current_user.user_id,
        "username": current_user.username,
        "name": current_user.name,
        "role": current_user.role,
        "department": current_user.department
    } 