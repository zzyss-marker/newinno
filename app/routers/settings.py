from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Optional
from ..database import get_db
from ..models.settings import SystemSettings
import logging

# 设置日志记录
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建路由
router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("/ai-feature")
async def get_ai_feature_status(db: Session = Depends(get_db)):
    """
    获取AI功能的启用状态
    此端点不需要用户登录
    """
    try:
        # 查询AI功能的设置
        setting = db.query(SystemSettings).filter(SystemSettings.key == "ai_feature_enabled").first()

        # 如果设置不存在，创建默认设置（默认禁用）
        if not setting:
            setting = SystemSettings(
                key="ai_feature_enabled",
                value="false",
                description="是否启用AI功能界面",
                is_enabled=False
            )
            db.add(setting)
            db.commit()
            db.refresh(setting)

        # 返回设置状态
        return {
            "enabled": setting.is_enabled,
            "key": setting.key,
            "description": setting.description
        }
    except Exception as e:
        logger.error(f"获取AI功能状态时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"服务器错误: {str(e)}"
        )

@router.post("/ai-feature")
async def update_ai_feature_status(
    data: dict,
    db: Session = Depends(get_db)
):
    """
    更新AI功能的启用状态
    此端点允许任何用户更新AI功能状态
    """

    # 从请求体中获取enabled参数
    if not isinstance(data, dict) or 'enabled' not in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请求数据无效，缺少'enabled'字段"
        )

    enabled = data['enabled']
    if not isinstance(enabled, bool):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'enabled'字段必须是布尔值"
        )

    try:
        # 查询AI功能的设置
        setting = db.query(SystemSettings).filter(SystemSettings.key == "ai_feature_enabled").first()

        # 如果设置不存在，创建新设置
        if not setting:
            setting = SystemSettings(
                key="ai_feature_enabled",
                value=str(enabled).lower(),
                description="是否启用AI功能界面",
                is_enabled=enabled
            )
            db.add(setting)
        else:
            # 更新现有设置
            setting.value = str(enabled).lower()
            setting.is_enabled = enabled

        db.commit()
        db.refresh(setting)

        # 记录操作日志
        logger.info(f"AI功能状态已更新为: {enabled}")

        # 返回更新后的状态
        return {
            "enabled": setting.is_enabled,
            "key": setting.key,
            "description": setting.description,
            "message": f"AI功能已{'启用' if enabled else '禁用'}"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"更新AI功能状态时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"服务器错误: {str(e)}"
        )
