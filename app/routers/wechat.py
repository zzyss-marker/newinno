"""
微信相关API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import models
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/wechat", tags=["wechat"])


class SaveOpenidRequest(BaseModel):
    openid: str


@router.post("/save-openid")
async def save_user_openid(
    request: SaveOpenidRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    保存用户的微信openid
    用于接收订阅消息推送
    """
    try:
        # 更新当前用户的openid
        current_user.wechat_openid = request.openid
        db.commit()
        
        return {
            "message": "openid保存成功",
            "user_id": current_user.user_id,
            "username": current_user.username,
            "role": current_user.role
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"保存openid失败: {str(e)}"
        )


@router.get("/check-openid")
async def check_user_openid(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    检查当前用户是否已保存openid
    """
    return {
        "has_openid": bool(current_user.wechat_openid),
        "openid": current_user.wechat_openid if current_user.wechat_openid else None,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "role": current_user.role
    }


@router.post("/test-save-openid")
async def test_save_openid(
    openid: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    测试接口:手动设置openid(仅用于开发测试)
    """
    try:
        current_user.wechat_openid = openid
        db.commit()
        
        print(f"测试保存openid成功: user_id={current_user.user_id}, username={current_user.username}, role={current_user.role}, openid={openid}")
        
        return {
            "success": True,
            "message": "测试openid保存成功",
            "user_id": current_user.user_id,
            "username": current_user.username,
            "role": current_user.role,
            "openid": openid
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"保存失败: {str(e)}"
        )
