import os
import sys
from app import create_app, db
from app.models import User

def promote_user_to_admin(username):
    """将指定用户提升为管理员"""
    print(f"开始将用户 {username} 提升为管理员...")
    
    # 创建应用上下文
    app = create_app()
    
    with app.app_context():
        # 查找用户
        user = User.query.filter_by(username=username).first()
        
        if not user:
            print(f"错误: 用户 {username} 不存在")
            sys.exit(1)
            
        # 检查是否已经是管理员
        if user.role == 'admin':
            print(f"用户 {username} 已经是管理员")
            sys.exit(0)
        
        try:
            # 将用户角色更新为管理员
            user.role = 'admin'
            db.session.commit()
            
            print(f"成功将用户 {user.name}({user.username}) 提升为管理员！")
            
        except Exception as e:
            print(f"提升用户为管理员时出错: {str(e)}")
            db.session.rollback()
            raise

def create_default_admin():
    """如果需要，为开发测试创建默认管理员账号"""
    app = create_app()
    
    with app.app_context():
        # 检查是否已经有管理员
        admin = User.query.filter_by(role='admin').first()
        if admin:
            print(f"系统中已存在管理员: {admin.name}({admin.username})")
            return
        
        # 检查默认测试用户是否存在
        test_user = User.query.filter_by(username='admin').first()
        
        if not test_user:
            # 创建测试用户
            test_user = User(
                username='admin',
                name='超级管理员',
                password='admin123',  # 在生产环境中应当使用哈希密码
                role='admin',
                department='系统管理'
            )
            db.session.add(test_user)
            db.session.commit()
            print("已创建默认管理员账号：")
            print("用户名: admin")
            print("密码: admin123")
        else:
            # 提升现有用户为管理员
            test_user.role = 'admin'
            db.session.commit()
            print(f"已将用户 {test_user.name}({test_user.username}) 提升为管理员")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        promote_user_to_admin(sys.argv[1])
    else:
        print("用法: python create_admin.py <username>")
        print("未提供用户名，将检查或创建默认管理员账号")
        create_default_admin() 