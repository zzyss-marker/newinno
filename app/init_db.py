from sqlalchemy.orm import Session
from app.models import Management

def init_printers(db: Session):
    """初始化打印机数据"""
    printers = [
        {
            "device_or_venue_name": "printer_1",
            "category": "printer",
            "quantity": 1,
            "available_quantity": 1,
            "status": "available"
        },
        {
            "device_or_venue_name": "printer_2",
            "category": "printer",
            "quantity": 1,
            "available_quantity": 1,
            "status": "available"
        },
        {
            "device_or_venue_name": "printer_3",
            "category": "printer",
            "quantity": 1,
            "available_quantity": 1,
            "status": "available"
        }
    ]
    
    for printer in printers:
        db_printer = db.query(Management).filter(
            Management.device_or_venue_name == printer["device_or_venue_name"]
        ).first()
        
        if not db_printer:
            db_printer = Management(**printer)
            db.add(db_printer)
    
    db.commit() 