import asyncio
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from app.database import SessionLocal
from app.scraper import sync_month_data

def scrape_historical_data():
    start_date = date(2025, 1, 1)
    # The user's system time was given as 2026-02-27
    end_date = date(2026, 2, 1)
    
    current_date = start_date
    db = SessionLocal()
    try:
        while current_date <= end_date:
            month_code = current_date.strftime("%Y%m")
            print(f"Scraping historical data for {month_code}...")
            sync_month_data(db, month_code)
            current_date += relativedelta(months=1)
            
        print("Historical scraping complete.")
    finally:
        db.close()

if __name__ == "__main__":
    scrape_historical_data()
