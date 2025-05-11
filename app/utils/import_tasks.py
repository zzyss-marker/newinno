import pandas as pd
import io
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from ..models import models
from ..utils.security import get_password_hash
from ..utils.task_manager import Task

def process_user_import(task: Task, db: Session, file_content: bytes, batch_size: int = 50) -> Dict[str, Any]:
    """
    处理用户导入任务

    Args:
        task: 任务对象，用于更新进度
        db: 数据库会话
        file_content: Excel文件内容
        batch_size: 每批处理的用户数量

    Returns:
        包含导入结果的字典
    """
    try:
        # 更新任务状态
        task.update_progress(5)

        # 读取Excel文件
        df = pd.read_excel(io.BytesIO(file_content), dtype={'password': str})
        total_rows = len(df)

        # 验证数据格式
        required_columns = ['username', 'name', 'department', 'role', 'password']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return {
                "success": False,
                "message": f"文件格式不正确，缺少以下列：{', '.join(missing_columns)}",
                "count": 0,
                "errors": []
            }

        # 初始化结果
        success_count = 0
        skipped_count = 0
        error_messages = []
        users_data = []

        # 计算每批处理后的进度增量
        progress_increment = 90 / (total_rows / batch_size + 1)  # 预留5%用于初始化和最终处理
        current_progress = 5

        # 分批处理用户数据
        for i in range(0, total_rows, batch_size):
            batch_df = df.iloc[i:i+batch_size]
            batch_users = []

            # 使用事务处理每一批次
            try:
                for _, row in batch_df.iterrows():
                    try:
                        username = str(row['username']).strip()

                        # 检查用户是否已存在
                        existing_user = db.query(models.User).filter(
                            models.User.username == username
                        ).first()

                        if existing_user:
                            skipped_count += 1
                            error_messages.append(f"用户 {username} ({row.get('name', '')}) 已存在，已跳过")
                            continue

                        # 确保密码是字符串类型
                        password = str(row['password']).strip()

                        # 创建新用户
                        hashed_password = get_password_hash(password)
                        user = models.User(
                            username=username,
                            name=str(row['name']).strip(),
                            department=str(row['department']).strip(),
                            role=str(row['role']).strip(),
                            password=hashed_password,
                            is_system_admin=False  # 确保导入的用户不是系统管理员
                        )

                        batch_users.append(user)
                        users_data.append({
                            'username': username,
                            'name': str(row['name']).strip(),
                            'department': str(row['department']).strip(),
                            'role': str(row['role']).strip()
                        })

                    except Exception as e:
                        error_msg = f"添加用户 {row.get('username', '未知')} ({row.get('name', '')}) 失败: {str(e)}"
                        error_messages.append(error_msg)

                # 批量添加用户
                if batch_users:
                    db.add_all(batch_users)
                    db.commit()
                    success_count += len(batch_users)

            except Exception as batch_error:
                # 如果批处理失败，回滚并记录错误
                db.rollback()
                error_msg = f"批量添加用户失败: {str(batch_error)}"
                error_messages.append(error_msg)

            # 更新进度
            current_progress += progress_increment
            task.update_progress(int(current_progress))

        # 最终处理
        task.update_progress(95)

        # 清理会话
        db.close()

        # 返回结果
        result = {
            "success": True,
            "message": "用户导入完成",
            "count": success_count,
            "skipped": skipped_count,
            "total": total_rows,
            "errors": error_messages,
            "users": users_data[:100]  # 只返回前100个用户，避免数据过大
        }

        task.update_progress(100)
        return result

    except Exception as e:
        # 发生异常时回滚事务
        try:
            db.rollback()
        except:
            pass  # 忽略回滚失败的错误

        error_msg = f"导入用户失败: {str(e)}"
        return {
            "success": False,
            "message": error_msg,
            "count": 0,
            "skipped": 0,
            "errors": [error_msg]
        }
