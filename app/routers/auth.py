from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from ..models import models
from ..schemas import (
    Token,
    TokenData,
    User,
    UserCreate,
    UserInfo
)
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

router = APIRouter(prefix="/api", tags=["auth"])

# 密码工具
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 配置
SECRET_KEY = "your-secret-key"  # 在生产环境中应该使用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """用户登录"""
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
        
        # 验证密码
        if not verify_password(form_data.password, user.password):
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
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user_info": {
                "username": user.username,
                "name": user.name,
                "role": user.role,
                "department": user.department
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登录失败"
        )

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

@router.get("/users/me")
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="无效的认证凭据")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="无效的认证凭据")
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {
        "username": user.username,
        "name": user.name,
        "role": user.role,
        "department": user.department
    }

@router.post("/auth/batch_create")
async def batch_create_accounts(
    users: List[UserCreate],
    db: Session = Depends(get_db)
):
    """批量创建用户账号"""
    try:
        for user_data in users:
            # 检查用户是否已存在
            existing_user = db.query(models.User).filter(
                models.User.username == user_data.username
            ).first()
            
            if not existing_user:
                # 创建新用户
                hashed_password = get_password_hash(user_data.id_number)  # 使用身份证后6位作为初始密码
                db_user = models.User(
                    username=user_data.username,
                    name=user_data.name,
                    department=user_data.department,
                    role=user_data.role,
                    password=hashed_password
                )
                db.add(db_user)
        
        db.commit()
        return {"message": "账号创建成功"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) 