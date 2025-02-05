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
    get_current_admin
)
from ..utils.excel import read_users_excel
from typing import List
import io
import bcrypt

router = APIRouter()

@router.post("/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(
        models.User.username == form_data.username
    ).first()
    
    if not user or not bcrypt.checkpw(
        form_data.password.encode('utf-8'), 
        user.password.encode('utf-8')
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}

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