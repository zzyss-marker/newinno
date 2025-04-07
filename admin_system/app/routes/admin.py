from flask import Blueprint, render_template, request, jsonify, send_file, current_app, redirect, url_for, flash
from flask_login import login_required, current_user
import pandas as pd
from .. import db
from ..models import Admin, User, VenueReservation, DeviceReservation, PrinterReservation, Management
from ..utils import allowed_file
import os
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import requests
import io
from sqlalchemy import func, case

bp = Blueprint('admin', __name__)

def get_api_url(endpoint):
    """构建API URL"""
    base_url = current_app.config['API_BASE_URL']
    url = f"{base_url}/{endpoint.lstrip('/')}"
    current_app.logger.debug(f"Constructed API URL: {url}")
    current_app.logger.debug(f"Base URL from config: {base_url}")
    current_app.logger.debug(f"Endpoint: {endpoint}")
    return url

def make_request(method, url, **kwargs):
    """统一的请求处理函数"""
    # 禁用所有代理
    kwargs.setdefault('proxies', {
        'http': None,
        'https': None
    })
    
    # 添加认证头
    headers = kwargs.get('headers', {})
    headers['Authorization'] = f'Bearer {current_app.config["API_TOKEN"]}'
    kwargs['headers'] = headers
    
    current_app.logger.debug(f"Making {method} request to: {url}")
    current_app.logger.debug(f"Request kwargs: {kwargs}")
    
    return requests.request(method, url, **kwargs)

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

@bp.route('/api/admin/users/import', methods=['POST'])
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
        response = make_request(
            'POST',
            get_api_url('admin/users/import'),
            files=files
        )
        
        # 获取响应内容
        result = response.json()
        
        if response.status_code >= 400:
            # 处理错误响应
            error_message = result.get('detail', '导入失败')
            if isinstance(error_message, dict):
                # 如果是详细的错误信息对象
                if 'error_messages' in error_message:
                    error_message = '\n'.join(error_message['error_messages'])
                elif 'message' in error_message:
                    error_message = error_message['message']
            return jsonify({'error': error_message}), response.status_code
            
        # 处理成功响应
        success_count = result.get('count', 0)
        error_messages = result.get('error_messages', [])
        
        # 构建返回消息
        message = f'成功导入 {success_count} 个用户'
        if error_messages:
            message += f'\n失败: {len(error_messages)} 个'
            message += '\n' + '\n'.join(error_messages[:5])  # 只显示前5个错误
            if len(error_messages) > 5:
                message += f'\n... 等共 {len(error_messages)} 个错误'
        
        return jsonify({
            'message': message,
            'count': success_count,
            'errors': error_messages
        })
        
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error importing users: {str(e)}")
        # 尝试从错误响应中获取详细信息
        error_message = '导入失败'
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                if isinstance(error_data, dict):
                    error_message = error_data.get('detail', error_data.get('error', '导入失败'))
                    if isinstance(error_message, dict):
                        if 'error_messages' in error_message:
                            error_message = '\n'.join(error_message['error_messages'])
                        elif 'message' in error_message:
                            error_message = error_message['message']
            except:
                pass
        return jsonify({'error': error_message}), 500

@bp.route('/api/admin/templates/user-import')
@login_required
def get_template():
    """从后端API获取用户导入模板"""
    try:
        # 使用统一的请求函数
        response = make_request(
            'GET',
            get_api_url('admin/templates/user-import'),  # 修改为正确的API端点
            headers={
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            stream=True
        )
        
        if response.status_code == 404:
            return jsonify({'error': '模板文件不存在'}), 404
            
        response.raise_for_status()
        
        return send_file(
            io.BytesIO(response.content),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='user_import_template.xlsx'  # 使用 download_name 替代 attachment_filename
        )
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error getting template: {str(e)}")
        return jsonify({'error': '获取模板失败'}), 500

@bp.route('/api/admin/users')
@login_required
def get_users():
    """从后端API获取用户列表"""
    try:
        response = make_request(
            'GET',
            get_api_url('admin/users'),
            headers={'Accept': 'application/json'}
        )
        
        if response.status_code == 404:
            return jsonify({'error': '找不到用户数据'}), 404
            
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error getting users: {str(e)}")
        return jsonify({'error': '获取用户列表失败'}), 500

@bp.route('/api/admin/users/<username>', methods=['DELETE'])
@login_required
def delete_user(username):
    """通过后端API删除用户"""
    try:
        response = requests.delete(
            get_api_url(f'admin/users/{username}'),
            headers={'Accept': 'application/json'}
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
        current_app.logger.info(f"Fetching reservations with dates: start={start_date}, end={end_date}")
        
        api_url = get_api_url('admin/reservations/list')
        
        params = {
            'start_date': start_date if start_date else None,
            'end_date': end_date if end_date else None
        }
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        current_app.logger.debug(f"Request details:")
        current_app.logger.debug(f"  URL: {api_url}")
        current_app.logger.debug(f"  Method: GET")
        current_app.logger.debug(f"  Headers: {headers}")
        current_app.logger.debug(f"  Params: {params}")
        
        # 使用新的请求函数
        response = make_request(
            'GET',
            api_url,
            params=params,
            headers=headers,
            timeout=10
        )
        
        # 记录响应信息
        current_app.logger.debug(f"Response details:")
        current_app.logger.debug(f"  Status code: {response.status_code}")
        current_app.logger.debug(f"  Headers: {dict(response.headers)}")
        current_app.logger.debug(f"  URL: {response.url}")  # 实际请求的URL
        
        if response.status_code == 404:
            return jsonify({'error': '未找到数据'}), 404
        
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            current_app.logger.error(f"HTTP Error: {str(e)}")
            current_app.logger.error(f"Response content: {response.text}")
            raise
        
        data = response.json()
        current_app.logger.debug(f"Response data type: {type(data)}")
        current_app.logger.debug(f"Response data: {data}")
        
        if not isinstance(data, list):
            data = data.get('reservations', [])
            
        current_app.logger.info(f"Successfully fetched {len(data)} reservations")
        return jsonify(data)
        
    except requests.exceptions.Timeout:
        current_app.logger.error("API request timed out")
        return jsonify({'error': '请求超时，请稍后重试'}), 504
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error fetching reservations: {str(e)}")
        error_details = str(e)
        if hasattr(e, 'response') and e.response is not None:
            error_details += f"\nResponse: {e.response.text}"
        if hasattr(e, 'request') and e.request is not None:
            current_app.logger.error(f"Request URL: {e.request.url}")
            current_app.logger.error(f"Request method: {e.request.method}")
            current_app.logger.error(f"Request headers: {e.request.headers}")
        current_app.logger.error(f"Detailed error: {error_details}")
        current_app.logger.error(f"Exception type: {type(e)}")
        current_app.logger.error(f"Exception args: {e.args}")
        return jsonify({'error': '获取预约记录失败'}), 500

@bp.route('/api/reservations/approve', methods=['POST'])
@login_required
def approve_reservation():
    """通过后端API审批预约"""
    try:
        data = request.get_json()
        if not data or 'type' not in data or 'id' not in data or 'status' not in data:
            return jsonify({'error': '无效的请求数据'}), 400
            
        response = make_request(
            'POST',
            get_api_url('admin/reservations/batch-approve'),
            params={'reservation_type': data['type']},
            json={
                'reservation_ids': [data['id']],
                'action': 'approve' if data['status'] == 'approved' else 'reject'
            },
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        )
        
        # 添加更详细的错误处理
        if response.status_code == 401:
            current_app.logger.error("Unauthorized access. Check API token.")
            return jsonify({'error': '认证失败，请检查API token'}), 401
            
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.Timeout:
        current_app.logger.error("API request timed out")
        return jsonify({'error': '请求超时，请稍后重试'}), 504
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error approving reservation: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            current_app.logger.error(f"Response content: {e.response.text}")
        return jsonify({'error': '审批失败'}), 500

@bp.route('/api/reservations/<reservation_type>/<int:reservation_id>', methods=['DELETE'])
@login_required
def delete_reservation(reservation_type, reservation_id):
    """删除预约记录"""
    try:
        response = make_request(
            'DELETE',
            get_api_url(f'admin/reservations/{reservation_type}/{reservation_id}'),
            headers={'Accept': 'application/json'}
        )
        
        if response.status_code == 404:
            return jsonify({'error': '预约记录不存在'}), 404
            
        response.raise_for_status()
        return jsonify({'message': '删除成功'})
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error deleting reservation: {str(e)}")
        return jsonify({'error': '删除失败'}), 500

@bp.route('/api/export/reservations')
@login_required
def export_reservations():
    """从后端API导出预约记录"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        response = make_request(
            'GET',
            get_api_url('admin/export-reservations'),
            params={
                'start_date': start_date if start_date else None,
                'end_date': end_date if end_date else None
            },
            headers={
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            stream=True,
            timeout=30
        )
        response.raise_for_status()
        
        # 从响应头中获取文件名，如果没有则使用默认文件名
        content_disposition = response.headers.get('content-disposition', '')
        filename = None
        if content_disposition:
            try:
                filename = content_disposition.split('filename=')[-1].strip('"')
                # 确保文件名是UTF-8编码
                filename = filename.encode('latin-1').decode('utf-8')
            except Exception:
                filename = None
                
        if not filename:
            filename = f'预约记录_{datetime.now().strftime("%Y%m%d")}.xlsx'
            
        return send_file(
            io.BytesIO(response.content),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename  # Flask 2.0+使用download_name替代attachment_filename
        )
    except requests.exceptions.Timeout:
        current_app.logger.error("Export request timed out")
        return jsonify({'error': '导出超时，请稍后重试'}), 504
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error exporting reservations: {str(e)}")
        return jsonify({'error': '导出失败'}), 500

# 设备和场地管理路由
@bp.route('/management')
@login_required
def management():
    # 获取设备和场地基本信息
    devices = Management.query.filter_by(category='device').all()
    venues = Management.query.filter_by(category='venue').all()
    return render_template('management/index.html', devices=devices, venues=venues)

@bp.route('/management/add', methods=['GET', 'POST'])
@login_required
def add_management():
    if request.method == 'POST':
        name = request.form.get('name')
        category = request.form.get('category')
        quantity = int(request.form.get('quantity'))
        
        item = Management(
            device_or_venue_name=name,
            category=category,
            quantity=quantity,
            available_quantity=quantity,
            status='available'
        )
        
        db.session.add(item)
        db.session.commit()
        flash('添加成功！', 'success')
        return redirect(url_for('admin.management'))
        
    return render_template('management/add.html')

@bp.route('/management/edit/<int:id>', methods=['GET', 'POST'])
@login_required
def edit_management(id):
    item = Management.query.get_or_404(id)
    
    if request.method == 'POST':
        item.device_or_venue_name = request.form.get('name')
        item.quantity = int(request.form.get('quantity'))
        item.available_quantity = int(request.form.get('available_quantity'))
        item.status = request.form.get('status')
        
        db.session.commit()
        flash('更新成功！', 'success')
        return redirect(url_for('admin.management'))
        
    return render_template('management/edit.html', item=item)

@bp.route('/management/delete/<int:id>', methods=['POST'])
@login_required
def delete_management(id):
    item = Management.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    flash('删除成功！', 'success')
    return redirect(url_for('admin.management'))

@bp.route('/api/management', methods=['GET'])
def get_management_items():
    category = request.args.get('category')
    query = Management.query
    if category:
        query = query.filter_by(category=category)
    items = query.all()
    return jsonify([{
        'id': item.management_id,
        'name': item.device_or_venue_name,
        'category': item.category,
        'quantity': item.quantity,
        'available_quantity': item.available_quantity,
        'status': item.status
    } for item in items]) 