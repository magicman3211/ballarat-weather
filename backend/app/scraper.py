import httpx
from bs4 import BeautifulSoup
from datetime import datetime, date
from sqlalchemy.orm import Session
from app.models import DailyWeather
import logging

logger = logging.getLogger(__name__)

BOM_URL_TEMPLATE = "https://www.bom.gov.au/climate/dwo/{yyyymm}/html/IDCJDW3005.{yyyymm}.shtml"

def fetch_and_parse_bom_data(yyyymm: str) -> list[dict]:
    url = BOM_URL_TEMPLATE.format(yyyymm=yyyymm)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = httpx.get(url, headers=headers, timeout=15.0)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to fetch BOM data for {yyyymm}: {e}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table', class_='data')
    
    if not table:
        logger.error(f"Could not find data table for {yyyymm}")
        return []

    parsed_data = []
    tbody = table.find('tbody')
    for row in tbody.find_all('tr'):
        cols = row.find_all(['th', 'td'])
        if len(cols) < 5:
            continue
            
        try:
            # Col 0: Date
            raw_date = cols[0].text.strip()
            # BOM format usually starting strictly from day 1 for the month
            day = int(raw_date) if raw_date.isdigit() else int(raw_date.split()[-1])
            record_date = date(int(yyyymm[:4]), int(yyyymm[4:]), day)
            
            # Col 2: Min Temp
            min_temp_str = cols[2].text.strip()
            min_temp = float(min_temp_str) if min_temp_str else None
            
            # Col 3: Max Temp
            max_temp_str = cols[3].text.strip()
            max_temp = float(max_temp_str) if max_temp_str else None
            
            # Col 4: Rainfall
            rain_str = cols[4].text.strip()
            rainfall = float(rain_str) if rain_str and rain_str != 'Trace' else 0.0 if rain_str == 'Trace' else None

            parsed_data.append({
                "date": record_date,
                "min_temp": min_temp,
                "max_temp": max_temp,
                "rainfall": rainfall,
                "month_code": yyyymm
            })
        except Exception as e:
            logger.warning(f"Failed to parse row: {e}")
            continue

    return parsed_data

def sync_month_data(db: Session, yyyymm: str):
    logger.info(f"Syncing data for month {yyyymm}...")
    data = fetch_and_parse_bom_data(yyyymm)
    
    records_updated = 0
    records_added = 0
    
    for item in data:
        db_record = db.query(DailyWeather).filter(DailyWeather.date == item["date"]).first()
        if db_record:
            # Update existing
            db_record.min_temp = item["min_temp"]
            db_record.max_temp = item["max_temp"]
            db_record.rainfall = item["rainfall"]
            records_updated += 1
        else:
            # Create new
            new_record = DailyWeather(**item)
            db.add(new_record)
            records_added += 1
            
    try:
        db.commit()
        logger.info(f"Synced {yyyymm} successfully: {records_added} added, {records_updated} updated.")
    except Exception as e:
        logger.error(f"DB commit failed for {yyyymm}: {e}")
        db.rollback()

def run_scraper_job(db_session: Session):
    now = datetime.now()
    # Sync current month
    current_month = now.strftime("%Y%m")
    sync_month_data(db_session, current_month)
    
    # Also sync previous month just in case
    # This ensures early in the month we get any late updates for previous month
    if now.month == 1:
        prev_month = f"{now.year - 1}12"
    else:
        prev_month = f"{now.year}{now.month - 1:02d}"
    
    sync_month_data(db_session, prev_month)
