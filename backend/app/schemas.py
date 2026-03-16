from pydantic import BaseModel
from datetime import date
from typing import Optional

class DailyWeatherBase(BaseModel):
    date: date
    min_temp: Optional[float] = None
    max_temp: Optional[float] = None
    rainfall: Optional[float] = None
    month_code: str

class DailyWeatherResponse(DailyWeatherBase):
    id: int

    class Config:
        from_attributes = True

class MonthlyStatsResponse(BaseModel):
    month_code: str
    avg_min: Optional[float]
    avg_max: Optional[float]
    total_rain: Optional[float]
    days_recorded: int
