from flask_login import UserMixin
from . import db, login_manager
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json

# User model now inherits from UserMixin to support Flask-Login
class User(UserMixin, db.Model):
    __tablename__ = 'users'

    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True, index=True)
    name = db.Column(db.String(255))
    password = db.Column(db.String(255))
    role = db.Column(db.String(50))
    department = db.Column(db.String(255))

    venue_reservations = db.relationship('VenueReservation', back_populates='user')
    device_reservations = db.relationship('DeviceReservation', back_populates='user')
    printer_reservations = db.relationship('PrinterReservation', back_populates='user')

    # Required for Flask-Login
    def get_id(self):
        return str(self.user_id)

    # Check if the user has admin role
    def is_admin(self):
        return self.role == 'admin'

    # Verify password for login
    def verify_password(self, password):
        # Simple password check - can be replaced with more secure method
        return self.password == password

class VenueReservation(db.Model):
    __tablename__ = 'venue_reservations'

    reservation_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    venue_type = db.Column(db.String)
    reservation_date = db.Column(db.Date)
    business_time = db.Column(db.String)
    purpose = db.Column(db.String)
    devices_needed = db.Column(db.JSON)
    status = db.Column(db.String, default="pending")
    created_at = db.Column(db.DateTime, default=datetime.now)

    user = db.relationship('User', back_populates='venue_reservations')

class DeviceReservation(db.Model):
    __tablename__ = 'device_reservations'

    reservation_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    device_name = db.Column(db.String(50))
    borrow_time = db.Column(db.DateTime)
    return_time = db.Column(db.DateTime)
    actual_return_time = db.Column(db.DateTime)
    reason = db.Column(db.Text)
    status = db.Column(db.String(50), default="pending")  # pending, approved, rejected, returned, return_pending
    created_at = db.Column(db.DateTime, default=datetime.now)
    usage_type = db.Column(db.String(50), default="takeaway")  # 'onsite' or 'takeaway'
    approver_name = db.Column(db.String(100), nullable=True)
    teacher_name = db.Column(db.String(100), nullable=True)  # 添加指导老师字段
    device_condition = db.Column(db.String(50), nullable=True)  # 归还时设备状态: normal(正常), damaged(故障)
    return_note = db.Column(db.Text, nullable=True)  # 归还备注信息
    return_approver = db.Column(db.String(100), nullable=True)  # 归还审批人

    user = db.relationship('User', back_populates='device_reservations')

class PrinterReservation(db.Model):
    __tablename__ = 'printer_reservations'

    reservation_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    printer_name = db.Column(db.String(50))
    reservation_date = db.Column(db.Date)
    print_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime, nullable=True)  # 结束时间
    estimated_duration = db.Column(db.Integer, nullable=True)  # 预计打印耗时（分钟）
    model_name = db.Column(db.String(100), nullable=True)  # 打印模型名称
    status = db.Column(db.String(50), default="pending")  # pending, approved, rejected, completed, completion_pending
    created_at = db.Column(db.DateTime, default=datetime.now)
    approver_name = db.Column(db.String(100), nullable=True)
    teacher_name = db.Column(db.String(100), nullable=True)  # 添加指导老师字段
    printer_condition = db.Column(db.String(50), nullable=True)  # 使用完成后打印机状态: normal(正常), damaged(故障)
    completion_note = db.Column(db.Text, nullable=True)  # 使用完成备注信息
    completion_approver = db.Column(db.String(100), nullable=True)  # 完成审批人

    user = db.relationship('User', back_populates='printer_reservations')

class Management(db.Model):
    __tablename__ = 'management'

    management_id = db.Column(db.Integer, primary_key=True)
    device_or_venue_name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # 'device' or 'venue'
    quantity = db.Column(db.Integer, nullable=False)
    available_quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='available')  # 'available' or 'maintenance'
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def __repr__(self):
        return f'<Management {self.device_or_venue_name}>'

class SystemSetting(db.Model):
    """系统设置模型，用于存储系统级别的配置项"""
    __tablename__ = 'system_settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def __repr__(self):
        return f'<SystemSetting {self.key}>'

    @classmethod
    def get_value(cls, key, default=None):
        """获取指定键的设置值"""
        setting = cls.query.filter_by(key=key).first()
        if setting:
            try:
                # 尝试解析为JSON
                return json.loads(setting.value)
            except json.JSONDecodeError:
                # 如果不是JSON，则直接返回字符串值
                return setting.value
        return default

    @classmethod
    def set_value(cls, key, value, description=None):
        """设置指定键的值"""
        # 如果值是字典或列表，则转换为JSON字符串
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        elif not isinstance(value, str):
            value = str(value)

        setting = cls.query.filter_by(key=key).first()
        if setting:
            setting.value = value
            if description:
                setting.description = description
        else:
            setting = cls(key=key, value=value, description=description)
            db.session.add(setting)

        db.session.commit()
        return setting