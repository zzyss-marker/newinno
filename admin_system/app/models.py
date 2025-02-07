from flask_login import UserMixin
from . import db, login_manager
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class Admin(UserMixin, db.Model):
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    
    @property
    def password(self):
        raise AttributeError('password is not a readable attribute')
        
    @password.setter
    def password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)

# 使用主应用的模型
class User(db.Model):
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
    status = db.Column(db.String(50), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    user = db.relationship('User', back_populates='device_reservations')

class PrinterReservation(db.Model):
    __tablename__ = 'printer_reservations'

    reservation_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    printer_name = db.Column(db.String(50))
    reservation_date = db.Column(db.Date)
    print_time = db.Column(db.DateTime)
    status = db.Column(db.String(50), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.now)

    user = db.relationship('User', back_populates='printer_reservations')

@login_manager.user_loader
def load_user(user_id):
    return Admin.query.get(int(user_id)) 