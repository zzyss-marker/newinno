from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required
from ..models import User
from .. import db

bp = Blueprint('auth', __name__)

@bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        # Find the user by username
        user = User.query.filter_by(username=username).first()

        # Check if user exists, has admin role, and password is correct
        if user and user.role == 'admin' and user.verify_password(password):
            login_user(user)
            return redirect(url_for('admin.index'))
        else:
            flash('登录失败: 用户名不存在、密码错误或您没有管理员权限')
            
    return render_template('auth/login.html')

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login')) 