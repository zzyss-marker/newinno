import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.config import Config

app = create_app(Config)

if __name__ == '__main__':
    app.run(debug=True, port=5000)  # 使用5000端口避免与现有服务冲突 