from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

from app import models, schemas
from app.database import engine, get_db
from app.scraper import sync_month_data, run_scraper_job
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler

# Create database tables if they do not exist
models.Base.metadata.create_all(bind=engine)

scheduler = BackgroundScheduler()

def scheduled_job():
    # Helper to run the job with its own DB session
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        run_scraper_job(db)
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    # Initialize scheduler to run every 6 hours
    scheduler.add_job(scheduled_job, 'interval', hours=6)
    scheduler.start()
    
    # Trigger an initial scrape on startup (in a background task or synchronous if fine for small datasets)
    scheduled_job()
    
    yield
    # Shutdown actions
    scheduler.shutdown()

app = FastAPI(title="Ballarat Weather Stats API", lifespan=lifespan)

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/weather/months", response_model=List[str])
def get_available_months(db: Session = Depends(get_db)):
    months = db.query(models.DailyWeather.month_code).distinct().order_by(models.DailyWeather.month_code.desc()).all()
    return [m[0] for m in months]


@app.get("/api/weather/stats", response_model=List[schemas.MonthlyStatsResponse])
def get_monthly_stats(db: Session = Depends(get_db)):
    stats = db.query(
        models.DailyWeather.month_code,
        func.avg(models.DailyWeather.min_temp).label('avg_min'),
        func.avg(models.DailyWeather.max_temp).label('avg_max'),
        func.sum(models.DailyWeather.rainfall).label('total_rain'),
        func.count(models.DailyWeather.id).label('days_recorded')
    ).group_by(models.DailyWeather.month_code).order_by(models.DailyWeather.month_code.desc()).all()
    
    return [
        schemas.MonthlyStatsResponse(
            month_code=stat.month_code,
            avg_min=round(stat.avg_min, 1) if stat.avg_min is not None else None,
            avg_max=round(stat.avg_max, 1) if stat.avg_max is not None else None,
            total_rain=round(stat.total_rain, 1) if stat.total_rain is not None else None,
            days_recorded=stat.days_recorded
        )
        for stat in stats
    ]

@app.get("/api/weather/stats/{year}", response_model=List[schemas.MonthlyStatsResponse])
def get_monthly_stats_for_year(year: str, db: Session = Depends(get_db)):
    stats = db.query(
        models.DailyWeather.month_code,
        func.avg(models.DailyWeather.min_temp).label('avg_min'),
        func.avg(models.DailyWeather.max_temp).label('avg_max'),
        func.sum(models.DailyWeather.rainfall).label('total_rain'),
        func.count(models.DailyWeather.id).label('days_recorded')
    ).filter(models.DailyWeather.month_code.startswith(year)).group_by(models.DailyWeather.month_code).order_by(models.DailyWeather.month_code.asc()).all()
    
    return [
        schemas.MonthlyStatsResponse(
            month_code=stat.month_code,
            avg_min=round(stat.avg_min, 1) if stat.avg_min is not None else None,
            avg_max=round(stat.avg_max, 1) if stat.avg_max is not None else None,
            total_rain=round(stat.total_rain, 1) if stat.total_rain is not None else None,
            days_recorded=stat.days_recorded
        )
        for stat in stats
    ]

@app.get("/api/weather/yearly_stats", response_model=List[schemas.YearlyStatsResponse])
def get_yearly_stats(db: Session = Depends(get_db)):
    year_col = func.substr(models.DailyWeather.month_code, 1, 4)
    stats = db.query(
        year_col.label('year'),
        func.avg(models.DailyWeather.min_temp).label('avg_min'),
        func.avg(models.DailyWeather.max_temp).label('avg_max'),
        func.sum(models.DailyWeather.rainfall).label('total_rain'),
        func.count(models.DailyWeather.id).label('days_recorded')
    ).group_by(year_col).order_by(year_col.asc()).all()
    
    return [
        schemas.YearlyStatsResponse(
            year=stat.year,
            avg_min=round(stat.avg_min, 1) if stat.avg_min is not None else None,
            avg_max=round(stat.avg_max, 1) if stat.avg_max is not None else None,
            total_rain=round(stat.total_rain, 1) if stat.total_rain is not None else None,
            days_recorded=stat.days_recorded
        )
        for stat in stats
    ]

@app.post("/api/admin/scrape/{year}/{month}")
def force_scrape(year: str, month: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    month_code = f"{year}{month.zfill(2)}"
    background_tasks.add_task(sync_month_data, db, month_code)
    return {"message": f"Scraping job for {month_code} started in background."}

@app.get("/api/weather/{year}/{month}", response_model=List[schemas.DailyWeatherResponse])
def get_weather_for_month(year: str, month: str, db: Session = Depends(get_db)):
    month_code = f"{year}{month.zfill(2)}"
    records = db.query(models.DailyWeather).filter(models.DailyWeather.month_code == month_code).order_by(models.DailyWeather.date.asc()).all()
    return records

@app.get("/api/weather/all_time_months")
def get_all_time_months(db: Session = Depends(get_db)):
    # Group by the last 2 digits of month_code (the month)
    month_col = func.substr(models.DailyWeather.month_code, 5, 2)
    stats = db.query(
        month_col.label('month'),
        func.avg(models.DailyWeather.min_temp).label('avg_min'),
        func.avg(models.DailyWeather.max_temp).label('avg_max')
    ).group_by(month_col).order_by(month_col.asc()).all()
    
    return [
        {
            "month": stat.month,
            "all_time_avg_min": round(stat.avg_min, 1) if stat.avg_min is not None else None,
            "all_time_avg_max": round(stat.avg_max, 1) if stat.avg_max is not None else None,
        }
        for stat in stats
    ]
