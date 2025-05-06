from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Optional, List
from ..database import get_db
from ..models import models
from ..utils.auth import get_current_user
import os
from dotenv import load_dotenv
import httpx
import logging

# 设置日志记录
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 加载环境变量
load_dotenv()

# 创建路由
router = APIRouter(prefix="/api/ai", tags=["ai"])

# 从环境变量中获取DeepSeek API密钥
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# 如果环境变量中没有设置API密钥，使用默认值（仅用于开发）
if not DEEPSEEK_API_KEY:
    print("警告: 未设置DEEPSEEK_API_KEY环境变量，将使用默认值")
    DEEPSEEK_API_KEY = "dev_key_replace_in_production"

@router.get("/config", response_model=Dict[str, str])
async def get_ai_config(current_user: models.User = Depends(get_current_user)):
    """
    获取AI配置信息，包括API密钥
    此端点需要用户登录才能访问
    """
    if not current_user:
        logger.error("用户未通过认证")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录"
        )
    
    try:
        # 获取用户ID，用于日志记录
        if isinstance(current_user, dict):
            user_id = current_user.get("user_id") or current_user.get("username")
            user_name = current_user.get("name", "未知用户")
        else:
            user_id = getattr(current_user, "user_id", None) or current_user.username
            user_name = current_user.name
        
        # 记录访问日志
        logger.info(f"用户 {user_id} ({user_name}) 获取了AI配置")
        
        # 返回配置信息
        config_data = {
            "apiKey": DEEPSEEK_API_KEY,
            "baseUrl": DEEPSEEK_BASE_URL,
            "model": DEEPSEEK_MODEL
        }
        
        logger.info(f"成功返回配置: {config_data}")
        return config_data
    except Exception as e:
        logger.error(f"获取AI配置时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"服务器错误: {str(e)}"
        )

@router.post("/chat")
async def chat_with_ai(request: Request, current_user: models.User = Depends(get_current_user)):
    """
    AI聊天接口，将用户消息转发到DeepSeek API
    此端点需要用户登录才能访问
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录"
        )
    
    # 获取请求数据
    data = await request.json()
    messages = data.get("messages", [])
    stream = data.get("stream", False)
    
    # 获取用户信息用于日志记录
    if isinstance(current_user, dict):
        user_id = current_user.get("user_id") or current_user.get("username")
        user_name = current_user.get("name", "未知用户")
    else:
        user_id = getattr(current_user, "user_id", None) or current_user.username
        user_name = current_user.name
    
    # 记录用户请求
    logger.info(f"用户 {user_id} ({user_name}) 发起AI聊天请求")
    
    try:
        # 构建发送到DeepSeek API的请求
        api_url = f"{DEEPSEEK_BASE_URL}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": DEEPSEEK_MODEL,
            "messages": messages,
            "stream": stream
        }
        
        # 调用DeepSeek API
        async with httpx.AsyncClient() as client:
            response = await client.post(api_url, json=payload, headers=headers)
            
            # 检查请求是否成功
            if response.status_code != 200:
                logger.error(f"DeepSeek API返回错误: {response.status_code}, {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="与AI服务通信时出错"
                )
            
            # 处理流式响应
            if stream:
                # 在实际实现中，您需要处理SSE流式响应
                # 这里简化为直接返回完整响应
                response_data = response.json()
                reply = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {"reply": reply}
            else:
                # 非流式响应
                response_data = response.json()
                reply = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {"reply": reply}
                
    except Exception as e:
        logger.error(f"处理AI聊天请求时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理请求时出错: {str(e)}"
        )

@router.get("/health")
async def ai_health_check():
    """
    AI服务健康检查接口
    此端点不需要认证
    """
    # 检查API配置
    api_configured = bool(DEEPSEEK_API_KEY and DEEPSEEK_API_KEY != "dev_key_replace_in_production")
    
    return {
        "status": "ok",
        "service": "ai",
        "configured": api_configured,
        "mode": "production" if api_configured else "mock_response"
    }