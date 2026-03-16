import csv
import sqlite3
import argparse
import os
from datetime import datetime

def import_weather_data(db_path, csv_path, data_type, dry_run=False):
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Mapping of data types to database columns
    column_map = {
        'max_temp': 'max_temp',
        'min_temp': 'min_temp',
        'rainfall': 'rainfall'
    }

    if data_type not in column_map:
        print(f"Error: Invalid data type {data_type}. Choose from: {', '.join(column_map.keys())}")
        return

    column_name = column_map[data_type]

    records_processed = 0
    records_updated = 0
    records_inserted = 0

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        # Handle cases where column names might have spaces or special characters
        # The CSV has: "Bureau of Meteorology station number,Year,Month,Day,Maximum temperature (Degree C)"
        # Let's normalize headers
        headers = [h.strip() for h in reader.fieldnames]
        
        # Determine value column name based on data_type
        value_header = None
        for head in reader.fieldnames:
            if data_type == 'max_temp' and 'Maximum temperature' in head:
                value_header = head
            elif data_type == 'min_temp' and 'Minimum temperature' in head:
                value_header = head
            elif data_type == 'rainfall' and 'Rainfall' in head:
                value_header = head

        if not value_header:
            print(f"Error: Could not find value column for {data_type} in CSV")
            return

        for row in reader:
            try:
                year = int(row['Year'])
                month = int(row['Month'])
                day = int(row['Day'])
                value_str = row[value_header].strip()
                
                if not value_str:
                    continue # Skip missing values
                
                value = float(value_str)
                
                date_str = f"{year:04d}-{month:02d}-{day:02d}"
                month_code = f"{year:04d}{month:02d}"
                
                # Check if record exists
                cursor.execute("SELECT id FROM daily_weather WHERE date = ?", (date_str,))
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing record
                    if not dry_run:
                        cursor.execute(f"UPDATE daily_weather SET {column_name} = ?, month_code = ? WHERE date = ?", 
                                     (value, month_code, date_str))
                    records_updated += 1
                else:
                    # Insert new record
                    if not dry_run:
                        # We need to handle required fields. id is autoincrement but not used in current DB (it has id INTEGER NOT NULL)
                        # Let's check max id
                        cursor.execute("SELECT MAX(id) FROM daily_weather")
                        max_id = cursor.fetchone()[0] or 0
                        new_id = max_id + 1
                        
                        cursor.execute(f"INSERT INTO daily_weather (id, date, {column_name}, month_code) VALUES (?, ?, ?, ?)",
                                     (new_id, date_str, value, month_code))
                    records_inserted += 1
                
                records_processed += 1
            except (ValueError, KeyError) as e:
                print(f"Skipping row due to error: {e}")
                continue

    if not dry_run:
        conn.commit()
    
    conn.close()
    
    status = "DRY RUN - No changes committed." if dry_run else "SUCCESS - database updated."
    print(f"{status}")
    print(f"Processed: {records_processed}")
    print(f"Inserted: {records_inserted}")
    print(f"Updated: {records_updated}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import weather data from BOM CSV to SQLite")
    parser.add_argument("db_path", help="Path to SQLite database")
    parser.add_argument("csv_path", help="Path to CSV file")
    parser.add_argument("data_type", choices=['max_temp', 'min_temp', 'rainfall'], help="Type of data being imported")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without committing")
    
    args = parser.parse_args()
    import_weather_data(args.db_path, args.csv_path, args.data_type, args.dry_run)
