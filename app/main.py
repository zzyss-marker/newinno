from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, reservations, admin, management
from .database import engine
from .models import models

# 创建数据库表
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="预约系统API")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(reservations.router, prefix="/api/reservations", tags=["reservations"])
app.include_router(admin.router, prefix="/api", tags=["admin"])
app.include_router(management.router, prefix="/api", tags=["management"])

@app.get("/")
async def root():
    return {"message": "Welcome to Reservation System API"} 