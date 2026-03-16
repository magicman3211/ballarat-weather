#!/bin/sh

# If the database doesn't exist in the mounted volume, copy the pre-populated one
if [ ! -f /app/data/weather.db ]; then
  echo "Populating initial database from git repository..."
  cp /app/weather.db /app/data/weather.db
fi

# Start the uvicorn server
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8001
