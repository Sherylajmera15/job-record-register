@echo off
echo Starting Job Record Register Backend...
cd /d "%~dp0backend"

IF NOT EXIST "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Backend starting at http://localhost:8000
echo API docs at http://localhost:8000/api/docs
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
