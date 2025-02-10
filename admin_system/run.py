import os
import sys

# 添加当前目录到 Python 路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from app import create_app
from app.config import Config

app = create_app(Config)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)  # 修改为监听所有网络接口 