import threading
import time
import uuid
from typing import Dict, Any, Callable, Optional, List
import traceback

# 任务状态
class TaskStatus:
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class Task:
    def __init__(self, task_id: str, task_type: str, description: str):
        self.task_id = task_id
        self.task_type = task_type
        self.description = description
        self.status = TaskStatus.PENDING
        self.progress = 0
        self.result = None
        self.error = None
        self.created_at = time.time()
        self.updated_at = time.time()
        self.completed_at = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "task_type": self.task_type,
            "description": self.description,
            "status": self.status,
            "progress": self.progress,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "completed_at": self.completed_at
        }

    def update_progress(self, progress: int):
        """更新任务进度"""
        self.progress = min(max(0, progress), 100)
        self.updated_at = time.time()

    def complete(self, result: Any = None):
        """标记任务为完成"""
        self.status = TaskStatus.COMPLETED
        self.progress = 100
        self.result = result
        self.updated_at = time.time()
        self.completed_at = time.time()

    def fail(self, error: str):
        """标记任务为失败"""
        self.status = TaskStatus.FAILED
        self.error = error
        self.updated_at = time.time()
        self.completed_at = time.time()

class TaskManager:
    _instance = None
    _tasks: Dict[str, Task] = {}
    _lock = threading.Lock()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = TaskManager()
        return cls._instance

    def create_task(self, task_type: str, description: str) -> Task:
        """创建新任务"""
        task_id = str(uuid.uuid4())
        task = Task(task_id, task_type, description)
        
        with self._lock:
            self._tasks[task_id] = task
        
        return task

    def get_task(self, task_id: str) -> Optional[Task]:
        """获取任务信息"""
        with self._lock:
            return self._tasks.get(task_id)

    def get_all_tasks(self) -> List[Task]:
        """获取所有任务"""
        with self._lock:
            return list(self._tasks.values())

    def run_task_in_background(self, task: Task, func: Callable, *args, **kwargs):
        """在后台线程中运行任务"""
        def wrapper():
            try:
                with self._lock:
                    task.status = TaskStatus.RUNNING
                    task.updated_at = time.time()
                
                # 执行任务函数
                result = func(task, *args, **kwargs)
                
                # 标记任务完成
                with self._lock:
                    task.complete(result)
            
            except Exception as e:
                # 捕获异常并标记任务失败
                error_msg = f"任务执行失败: {str(e)}\n{traceback.format_exc()}"
                print(error_msg)
                
                with self._lock:
                    task.fail(error_msg)
        
        # 创建并启动线程
        thread = threading.Thread(target=wrapper)
        thread.daemon = True
        thread.start()
        
        return task

    def clean_old_tasks(self, max_age_hours: int = 24):
        """清理旧任务"""
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        with self._lock:
            task_ids_to_remove = []
            
            for task_id, task in self._tasks.items():
                # 如果任务已完成或失败，且超过最大保留时间
                if (task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED] and 
                    task.completed_at and 
                    current_time - task.completed_at > max_age_seconds):
                    task_ids_to_remove.append(task_id)
            
            # 删除旧任务
            for task_id in task_ids_to_remove:
                del self._tasks[task_id]
