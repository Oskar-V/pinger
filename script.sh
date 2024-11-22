#!/bin/bash

# Database file
DB_FILE="~/pinger.db"

# Path to the lock file
LOCK_FILE="/tmp/ping_instances.lock"

# Check if sqlite3 binary exists and is executable
if ! command -v sqlite3 &> /dev/null; then
  echo "Error: sqlite3 is not installed or not in the PATH."
  exit 1
fi

# Check if there are enough arguments
if [ "$#" -lt 1 ]; then
  echo "Usage: $0 IP1 [IP2 ... IPn]"
  exit 1
fi

# Check if the database path is writable
if [ -e "$DB_FILE" ] && [ ! -w "$DB_FILE" ]; then
  echo "Error: Cannot write to the database file $DB_FILE. Exiting."
  exit 1
fi

# Check if the lock file exists to prevent duplicate instances
if [ -e "$LOCK_FILE" ]; then
  echo "Script is already running. Exiting."
  exit 1
else
  # Create a lock file to indicate the script is running
  touch "$LOCK_FILE"
fi

# Remove the lock file on exit
trap "rm -f $LOCK_FILE" EXIT

# Loop through each IP provided as an argument
for i in "$@"; do
	table_name="ping_$i"
  
  # Create the SQLite database and table if it doesn't exist
  sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS pings (timestamp TEXT, response_time_ms REAL);"

  # Start the pinging process in the background
  (
    echo "Starting instance for IP $i, logging to $DB_FILE : $table_name"

    # Infinite loop to continuously ping the IP
    while true; do
      # Generate an ISO 8601 timestamp
      timestamp=$(date '+%Y-%m-%dT%H:%M:%S')

      # Ping the IP address once and extract the response time
      response_time=$(ping -c 1 "$i" | awk -F'time=' '/time=/{print $2}' | cut -d' ' -f1)
      
      # Check if we got a response time; if not, set it to -1 (timeout)
      if [ -z "$response_time" ]; then
        response_time=-1
      fi

      # Insert the ping result into the SQLite database
      sqlite3 "$DB_FILE" "INSERT INTO $table_name (timestamp, response_time_ms) VALUES ('$timestamp', $response_time);"
      
      # Wait for a second before the next ping
      sleep 1
    done
  ) &
done

echo "All instances started."
