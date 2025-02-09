import uvicorn
import multiprocessing
from flask import Flask
import sys
import os

def run_fastapi():
    """运行 FastAPI 后端服务"""
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)

def run_flask():
    """运行 Flask admin system"""
    # 添加 admin_system 到 Python 路径
    sys.path.append(os.path.join(os.path.dirname(__file__), 'admin_system'))
    
    # 导入 Flask 应用
    from admin_system.app import create_app
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)

if __name__ == "__main__":
    # 设置多进程启动方法（在 Windows 上需要）
    multiprocessing.freeze_support()
    
    # 创建进程
    fastapi_process = multiprocessing.Process(target=run_fastapi)
    flask_process = multiprocessing.Process(target=run_flask)

    try:
        # 启动进程
        fastapi_process.start()
        flask_process.start()
        
        print("FastAPI running on http://localhost:8001")
        print("Admin System running on http://localhost:5000")

        # 等待进程结束
        fastapi_process.join()
        flask_process.join()
    except KeyboardInterrupt:
        # 处理 Ctrl+C
        print("\nShutting down servers...")
        fastapi_process.terminate()
        flask_process.terminate()
        
        # 等待进程完全结束
        fastapi_process.join()
        flask_process.join()
        print("Servers stopped")
    except Exception as e:
        print(f"Error occurred: {e}")
        fastapi_process.terminate()
        flask_process.terminate()
        raise 