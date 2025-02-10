import os
import multiprocessing
import sys

def run_fastapi():
    """运行 FastAPI 后端服务"""
    os.system("uvicorn app.main:app --host 0.0.0.0 --port 8001")

def run_flask():
    """运行 Flask admin system"""
    # 添加项目根目录到 Python 路径
    root_path = os.path.dirname(os.path.abspath(__file__))
    admin_path = os.path.join(root_path, 'admin_system')
    os.environ['PYTHONPATH'] = admin_path
    
    # 导入 Flask 应用
    from admin_system.run import app
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