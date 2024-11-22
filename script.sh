#!/bin/bash

# Directory for database files
DB_PATH="[PATH_TO_DB_FOLDER]"

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

# Ensure database folder exists
if [ ! -d "$DB_PATH" ]; then
  mkdir -p "$DB_PATH" || { echo "Error: Cannot create database directory $DB_PATH"; exit 1; }
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

# Optimized function for pinging and writing results
ping_and_log() {
  local ip="$1"
  local db_file="$2"

  # Initialize the database
  sqlite3 "$db_file" <<EOF
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
CREATE TABLE IF NOT EXISTS ping (
  timestamp TEXT,
  response_time_ms REAL
);
EOF

  # Batch rows for performance
  batch_rows=""
  batch_size=10

  echo "Starting ping instance for IP $ip, logging to $db_file"

  while true; do
    timestamp=$(date '+%Y-%m-%dT%H:%M:%S')
    response_time=$(ping -c 1 "$ip" | awk -F'time=' '/time=/{print $2}' | cut -d' ' -f1 || echo -1)

    # Append the result to the batch
    batch_rows+="'$timestamp', $response_time), ("

    # Write batch to the database when it reaches the batch size
    if [ "$(echo "$batch_rows" | grep -o ')' | wc -l)" -ge "$batch_size" ]; then
      batch_rows=${batch_rows::-3} # Remove trailing ", ("
      sqlite3 "$db_file" <<EOF
BEGIN TRANSACTION;
INSERT INTO ping (timestamp, response_time_ms) VALUES ($batch_rows);
COMMIT;
EOF
      batch_rows=""
    fi

    sleep 1
  done
}

# Loop through each IP and spawn a subprocess
for ip in "$@"; do
  db_file="$DB_PATH/ping_$ip.db"

  # Use subshell to ping and log in the background
  (
    ping_and_log "$ip" "$db_file"
  ) &
done

wait  # Wait for all background processes to finish

echo "All instances started."
