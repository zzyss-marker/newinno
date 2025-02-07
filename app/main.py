from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, reservations, admin, management
from .database import engine
from .models import models

# 确保创建所有数据库表
print("Creating database tables...")  # 调试信息
models.Base.metadata.create_all(bind=engine)
print("Database tables created")  # 调试信息

app = FastAPI()

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有头部
)

# 注册路由
app.include_router(auth.router)  # /api/token, /api/users/me
app.include_router(admin.router)  # /api/admin/*
app.include_router(reservations.router)  # /api/reservations/*
app.include_router(management.router)  # /api/management/*

@app.get("/")
async def root():
    return {"message": "Welcome to Reservation System API"} 