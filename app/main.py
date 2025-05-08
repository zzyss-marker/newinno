from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, reservations, admin, management, ai, settings
from .database import engine
from .models import models
from .db.init_db import init_db

# 初始化数据库
print("Initializing database...")
init_db()
print("Database initialization completed")

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
app.include_router(ai.router)  # /api/ai/*
app.include_router(settings.router)  # /api/settings/*

@app.get("/")
async def root():
    return {"message": "Welcome to Reservation System API"}