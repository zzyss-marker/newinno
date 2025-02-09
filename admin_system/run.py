import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.config import Config

app = create_app(Config)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)  # 修改为监听所有网络接口 