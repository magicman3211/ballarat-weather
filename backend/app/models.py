from sqlalchemy import Column, Integer, String, Float, Date
from app.database import Base

class DailyWeather(Base):
    __tablename__ = "daily_weather"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True, nullable=False)
    min_temp = Column(Float, nullable=True)
    max_temp = Column(Float, nullable=True)
    rainfall = Column(Float, nullable=True)
    month_code = Column(String(6), index=True, nullable=False) # Format: YYYYMM
