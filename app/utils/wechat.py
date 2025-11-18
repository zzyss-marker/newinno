"""
微信小程序订阅消息服务
"""
import requests
import json
from typing import Optional, Dict
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

# 微信小程序配置 - 从环境变量读取
WECHAT_APPID = os.getenv("WECHAT_APPID", "")
WECHAT_SECRET = os.getenv("WECHAT_SECRET", "")

# 订阅消息模板ID - 从环境变量读取
TEMPLATE_ID_RESERVATION_NOTICE = os.getenv("WECHAT_TEMPLATE_RESERVATION_NOTICE", "")  # 预约申请处理通知
TEMPLATE_ID_APPROVAL_RESULT = os.getenv("WECHAT_TEMPLATE_APPROVAL_RESULT", "")  # 审核通过提醒

# 全局access_token缓存
_access_token_cache = {
    "token": None,
    "expires_at": 0
}


def get_access_token() -> Optional[str]:
    """
    获取微信access_token
    会自动缓存token直到过期
    """
    current_time = datetime.now().timestamp()
    
    # 如果缓存的token还未过期，直接返回
    if _access_token_cache["token"] and _access_token_cache["expires_at"] > current_time:
        return _access_token_cache["token"]
    
    # 获取新的access_token
    url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={WECHAT_APPID}&secret={WECHAT_SECRET}"
    
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if "access_token" in data:
            # 缓存token，提前5分钟过期以避免边界情况
            _access_token_cache["token"] = data["access_token"]
            _access_token_cache["expires_at"] = current_time + data.get("expires_in", 7200) - 300
            return data["access_token"]
        else:
            logger.error(f"获取access_token失败: {data}")
            return None
    except Exception as e:
        logger.error(f"获取access_token异常: {str(e)}")
        return None


def send_subscribe_message(
    openid: str,
    template_id: str,
    data: Dict,
    page: Optional[str] = None
) -> bool:
    """
    发送订阅消息
    
    Args:
        openid: 用户的openid
        template_id: 模板ID
        data: 消息数据，格式为 {"key": {"value": "值"}}
        page: 点击消息跳转的页面路径
    
    Returns:
        bool: 发送是否成功
    """
    if not openid:
        logger.warning("openid为空，无法发送订阅消息")
        return False
    
    access_token = get_access_token()
    if not access_token:
        logger.error("无法获取access_token，发送订阅消息失败")
        return False
    
    url = f"https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={access_token}"
    
    payload = {
        "touser": openid,
        "template_id": template_id,
        "data": data
    }
    
    if page:
        payload["page"] = page
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        result = response.json()
        
        if result.get("errcode") == 0:
            logger.info(f"订阅消息发送成功: openid={openid}, template_id={template_id}")
            return True
        else:
            logger.error(f"订阅消息发送失败: {result}")
            return False
    except Exception as e:
        logger.error(f"发送订阅消息异常: {str(e)}")
        return False


def send_reservation_notice_to_admin(
    admin_openid: str,
    user_name: str,
    reservation_item: str,
    reservation_time: str
) -> bool:
    """
    发送预约申请通知给管理员
    
    模板内容:
    - 预约人: {{name5.DATA}}
    - 预约事项: {{thing6.DATA}}
    - 预约时间: {{time10.DATA}}
    """
    data = {
        "name5": {"value": user_name},
        "thing6": {"value": reservation_item[:20]},  # 限制20个字符
        "time10": {"value": reservation_time}
    }
    
    return send_subscribe_message(
        openid=admin_openid,
        template_id=TEMPLATE_ID_RESERVATION_NOTICE,
        data=data,
        page="pages/approval/approval"  # 跳转到审批页面
    )


def send_approval_result_to_user(
    user_openid: str,
    approval_result: str,
    service_name: str,
    reservation_time: str
) -> bool:
    """
    发送审核结果通知给用户
    
    模板内容:
    - 审核结果: {{phrase1.DATA}}
    - 服务名称: {{thing36.DATA}}
    - 预约时间: {{time24.DATA}}
    """
    data = {
        "phrase1": {"value": approval_result},
        "thing36": {"value": service_name[:20]},  # 限制20个字符
        "time24": {"value": reservation_time}
    }
    
    return send_subscribe_message(
        openid=user_openid,
        template_id=TEMPLATE_ID_APPROVAL_RESULT,
        data=data,
        page="pages/records/records"  # 跳转到预约记录页面
    )


def notify_admins_new_reservation(
    db,
    user_name: str,
    reservation_item: str,
    reservation_time: str
):
    """
    通知所有已保存openid的管理员有新预约
    
    Args:
        db: 数据库会话
        user_name: 预约人姓名
        reservation_item: 预约事项
        reservation_time: 预约时间
    """
    from ..models import models
    
    # 查询所有有openid的管理员
    admins = db.query(models.User).filter(
        models.User.role == "admin",
        models.User.wechat_openid.isnot(None),
        models.User.wechat_openid != ""
    ).all()
    
    success_count = 0
    for admin in admins:
        if send_reservation_notice_to_admin(
            admin_openid=admin.wechat_openid,
            user_name=user_name,
            reservation_item=reservation_item,
            reservation_time=reservation_time
        ):
            success_count += 1
    
    logger.info(f"通知管理员新预约: 成功{success_count}/{len(admins)}")
    return success_count


def notify_user_approval_result(
    user_openid: str,
    is_approved: bool,
    service_name: str,
    reservation_time: str
) -> bool:
    """
    通知用户审核结果
    
    Args:
        user_openid: 用户openid
        is_approved: 是否通过
        service_name: 服务名称
        reservation_time: 预约时间
    """
    approval_result = "审核通过" if is_approved else "审核未通过"
    
    return send_approval_result_to_user(
        user_openid=user_openid,
        approval_result=approval_result,
        service_name=service_name,
        reservation_time=reservation_time
    )
