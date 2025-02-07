import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5001)  # 使用5001端口避免与现有服务冲突 