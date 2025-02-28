from flask import Blueprint, jsonify, request
from ..models import Management, VenueReservation
from .. import db

bp = Blueprint('venue', __name__)

@bp.route('/available', methods=['GET'])
def get_available_venues():
    """获取可用的场地列表"""
    venues = Management.query.filter_by(
        category='venue',
        status='available'
    ).all()
    
    return jsonify([{
        'id': venue.management_id,
        'name': venue.device_or_venue_name,
        'available_quantity': venue.available_quantity
    } for venue in venues])

@bp.route('/devices', methods=['GET'])
def get_available_devices():
    """获取可用的设备列表"""
    devices = Management.query.filter_by(
        category='device',
        status='available'
    ).all()
    
    return jsonify([{
        'id': device.management_id,
        'name': device.device_or_venue_name,
        'available_quantity': device.available_quantity
    } for device in devices]) 