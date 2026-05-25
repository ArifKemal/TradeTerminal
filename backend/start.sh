#!/bin/bash
# Backend başlat — önce portu temizle (Windows uyumlu)

PORT=8000

# Python ile portu temizle
python -c "
import subprocess, sys
result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
for line in result.stdout.splitlines():
    if ':${PORT}' in line and 'LISTENING' in line:
        pid = line.strip().split()[-1]
        print(f'Killing PID {pid} on port ${PORT}')
        subprocess.run(['taskkill', '/PID', pid, '/F'], capture_output=True)
        break
"

sleep 2

echo "Starting FastAPI on port $PORT..."
source venv/Scripts/activate
python main.py
