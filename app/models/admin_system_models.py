from sqlalchemy import Column, Integer, String, DateTime
from ..db.admin_system_db import Base
from datetime import datetime

class Management(Base):
    __tablename__ = "management"
    
    management_id = Column(Integer, primary_key=True)
    device_or_venue_name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    quantity = Column(Integer, nullable=False)
    available_quantity = Column(Integer, nullable=False)
    status = Column(String(50), default='available')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    def __repr__(self):
        return f'<Management {self.device_or_venue_name}>' 