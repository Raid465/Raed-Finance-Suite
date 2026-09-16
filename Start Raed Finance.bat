@echo off
setlocal EnableExtensions
cd /d "%~dp0project"
title Raed Finance Suite - Final Site
color 0A

echo =====================================================
echo          RAED FINANCE SUITE - STARTER
echo =====================================================
echo.

echo [1/4] Checking Python...
set "PYTHON_CMD="
where py >nul 2>nul && set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD (
    where python >nul 2>nul && set "PYTHON_CMD=python"
)
if not defined PYTHON_CMD (
    echo.
    echo ERROR: Python was not found.
    echo Install Python 3.10 or newer and enable "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

rem Python 3.10+ compatibility check
%PYTHON_CMD% -c "import sys; raise SystemExit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if errorlevel 1 (
    echo ERROR: Python 3.10 or newer is required.
    pause
    exit /b 1
)

echo [2/4] Checking Node.js and npm...
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: Node.js was not found.
    echo Install Node.js LTS, then run this file again.
    echo.
    pause
    exit /b 1
)
rem Vite 8 requires Node.js ^20.19.0 or >=22.12.0
node -e "const [M,m]=process.versions.node.split('.').map(Number);process.exit(((M===20&&m>=19)||(M===22&&m>=12)||M>22)?0:1)" >nul 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: This project requires Node.js 20.19+ or Node.js 22.12+.
    echo Install the current Node.js LTS release and try again.
    echo.
    pause
    exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: npm was not found.
    echo Reinstall Node.js LTS and make sure it is added to PATH.
    echo.
    pause
    exit /b 1
)

echo [3/4] Checking dependencies...
if not exist "apps\investment-calculator\node_modules\.bin\vite.cmd" goto INSTALL
if not exist "apps\investment-calculator\node_modules\react\package.json" goto INSTALL
if not exist "apps\stock-comparison-tool\node_modules\.bin\vite.cmd" goto INSTALL
if not exist "apps\stock-comparison-tool\node_modules\express\package.json" goto INSTALL
if not exist "apps\stock-comparison-tool\node_modules\yahoo-finance2\package.json" goto INSTALL
%PYTHON_CMD% -c "import fastapi,uvicorn,yfinance,numpy,bs4,requests" >nul 2>nul
if errorlevel 1 goto INSTALL
goto START

:INSTALL
echo.
echo Some dependencies are missing. Installing them now...
echo This requires an Internet connection.
echo.
%PYTHON_CMD% launcher\start_all.py --install
if errorlevel 1 (
    echo.
    echo ERROR: Setup failed. Read the message above.
    echo You can also check the logs folder.
    echo.
    pause
    exit /b 1
)
exit /b 0

:START
echo [4/4] Starting all servers...
echo.
echo The dashboard will open automatically at:
echo http://127.0.0.1:5050
echo.
echo IMPORTANT: Keep this black window open while using the site.
echo.
%PYTHON_CMD% launcher\start_all.py
set "ERR=%ERRORLEVEL%"
echo.
if not "%ERR%"=="0" echo The launcher stopped with error code %ERR%.
echo If a service failed, open the logs folder in this project.
echo.
pause
exit /b %ERR%
