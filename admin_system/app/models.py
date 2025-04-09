from flask_login import UserMixin
from . import db, login_manager
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

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