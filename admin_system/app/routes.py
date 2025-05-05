from flask import render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from . import app, db
from .models import Management, VenueReservation, DeviceReservation, PrinterReservation
from datetime import datetime
from sqlalchemy import func

# 设备和场地管理路由
@app.route('/management')
@login_required
def management():
    # 获取设备和场地基本信息
    devices = Management.query.filter_by(category='device').all()
    venues = Management.query.filter_by(category='venue').all()
    
    # 统计设备预约信息
    device_stats = {}
    for device in devices:
        stats = DeviceReservation.query.filter_by(
            device_name=device.device_or_venue_name
        ).with_entities(
            func.count().label('total_reservations'),
            func.count(case=[(DeviceReservation.status == 'pending', 1)]).label('pending_count'),
            func.count(case=[(DeviceReservation.status == 'approved', 1)]).label('approved_count')
        ).first()
        
        device_stats[device.management_id] = {
            'total_reservations': stats.total_reservations,
            'pending_count': stats.pending_count,
            'approved_count': stats.approved_count
        }
    
    # 统计场地预约信息
    venue_stats = {}
    for venue in venues:
        stats = VenueReservation.query.filter_by(
            venue_type=venue.device_or_venue_name
        ).with_entities(
            func.count().label('total_reservations'),
            func.count(case=[(VenueReservation.status == 'pending', 1)]).label('pending_count'),
            func.count(case=[(VenueReservation.status == 'approved', 1)]).label('approved_count')
        ).first()
        
        venue_stats[venue.management_id] = {
            'total_reservations': stats.total_reservations,
            'pending_count': stats.pending_count,
            'approved_count': stats.approved_count
        }
    
    return render_template('management/index.html', 
                         devices=devices, 
                         venues=venues,
                         device_stats=device_stats,
                         venue_stats=venue_stats)

@app.route('/management/add', methods=['GET', 'POST'])
@login_required
def add_management():
    if request.method == 'POST':
        name = request.form.get('name')
        category = request.form.get('category')
        
        # 使用默认值1填充数量字段 - 确保没有从表单获取quantity
        item = Management(
            device_or_venue_name=name,
            category=category,
            quantity=1,  # 硬编码为1，不从表单获取
            available_quantity=1,  # 硬编码为1，不从表单获取
            status='available'
        )
        
        db.session.add(item)
        db.session.commit()
        flash('添加成功！', 'success')
        return redirect(url_for('management'))
        
    return render_template('management/add.html')

@app.route('/management/edit/<int:id>', methods=['GET', 'POST'])
@login_required
def edit_management(id):
    item = Management.query.get_or_404(id)
    
    if request.method == 'POST':
        # 只更新名称，其他字段保持不变
        item.device_or_venue_name = request.form.get('name')
        
        db.session.commit()
        flash('更新成功！', 'success')
        return redirect(url_for('management'))
        
    return render_template('management/edit.html', item=item)

@app.route('/management/delete/<int:id>', methods=['POST'])
@login_required
def delete_management(id):
    item = Management.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    flash('删除成功！', 'success')
    return redirect(url_for('management'))

# API接口
@app.route('/api/management', methods=['GET'])
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