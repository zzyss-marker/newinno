from flask import Blueprint, render_template, request, jsonify, send_file, current_app
from flask_login import login_required
import pandas as pd
from .. import db
from ..models import Admin, User, VenueReservation, DeviceReservation, PrinterReservation
from ..utils import allowed_file
import os
from werkzeug.security import generate_password_hash
from datetime import datetime
import requests
import io

bp = Blueprint('admin', __name__)

@bp.route('/')
@login_required
def index():
    """管理系统首页"""
    return render_template('admin/index.html')

@bp.route('/users')
@login_required
def users():
    """用户管理页面"""
    return render_template('admin/users.html')

@bp.route('/api/users/import', methods=['POST'])
@login_required
def import_users():
    """通过后端API导入用户"""
    if 'file' not in request.files:
        return jsonify({'error': '没有文件'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '无效的文件'}), 400

    try:
        # 调用后端API导入用户
        files = {'file': (file.filename, file.stream, file.content_type)}
        response = requests.post(
            'http://localhost:8001/api/admin/users/import',
            files=files
        )
        response.raise_for_status()
        
        # 获取导入的用户数据并同步到认证系统
        users_data = response.json().get('users', [])
        if users_data:
            # 调用后端的账号创建API
            auth_response = requests.post(
                'http://localhost:8001/api/auth/batch_create',
                json={'users': users_data}
            )
            auth_response.raise_for_status()
            
        return jsonify({
            'message': f'成功导入用户并创建账号',
            'count': len(users_data)
        })
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error importing users: {str(e)}")
        return jsonify({'error': '导入失败'}), 500

@bp.route('/api/export/template')
@login_required
def export_template():
    """从后端API获取用户导入模板"""
    try:
        response = requests.get(
            'http://localhost:8001/api/admin/users/template',
            stream=True
        )
        response.raise_for_status()
        
        return send_file(
            io.BytesIO(response.content),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            attachment_filename='用户导入模板.xlsx'
        )
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error getting template: {str(e)}")
        return jsonify({'error': '获取模板失败'}), 500

@bp.route('/api/users')
@login_required
def get_users():
    """从后端API获取用户列表"""
    try:
        response = requests.get('http://localhost:8001/api/admin/users')
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error fetching users: {str(e)}")
        return jsonify({'error': '获取用户列表失败'}), 500

@bp.route('/api/users/<username>', methods=['DELETE'])
@login_required
def delete_user(username):
    """通过后端API删除用户"""
    try:
        response = requests.delete(
            f'http://localhost:8001/api/admin/users/{username}'
        )
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error deleting user: {str(e)}")
        return jsonify({'error': '删除用户失败'}), 500

@bp.route('/reservations')
@login_required
def reservations():
    """预约记录页面"""
    return render_template('admin/reservations.html')

@bp.route('/api/reservations')
@login_required
def get_reservations():
    """从后端API获取预约记录"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        # 调用后端API
        response = requests.get(
            'http://localhost:8001/api/admin/export/reservations',
            params={'start_date': start_date, 'end_date': end_date}
        )
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error fetching reservations: {str(e)}")
        return jsonify({'error': '获取预约记录失败'}), 500

@bp.route('/api/reservations/approve', methods=['POST'])
@login_required
def approve_reservation():
    """通过后端API审批预约"""
    try:
        # 调用后端API
        response = requests.post(
            'http://localhost:8001/api/admin/reservations/approve',
            json=request.get_json()
        )
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error approving reservation: {str(e)}")
        return jsonify({'error': '审批失败'}), 500

@bp.route('/api/export/reservations')
@login_required
def export_reservations():
    """从后端API导出预约记录"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        response = requests.get(
            'http://localhost:8001/api/admin/export/reservations',
            params={'start_date': start_date, 'end_date': end_date},
            stream=True
        )
        response.raise_for_status()
        
        return send_file(
            io.BytesIO(response.content),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            attachment_filename=f'预约记录_{datetime.now().strftime("%Y%m%d")}.xlsx'
        )
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error exporting reservations: {str(e)}")
        return jsonify({'error': '导出失败'}), 500 