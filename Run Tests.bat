@echo off
setlocal EnableExtensions
cd /d "%~dp0project"
title Raed Finance Suite - Full Tests
where py >nul 2>nul && (set PY=py -3) || (set PY=python)

where node >nul 2>nul
if errorlevel 1 goto :missingdeps
where npm.cmd >nul 2>nul
if errorlevel 1 goto :missingdeps

if not exist "apps\investment-calculator\node_modules\.bin\vite.cmd" goto :missingdeps
if not exist "apps\stock-comparison-tool\node_modules\.bin\vite.cmd" goto :missingdeps

echo =====================================================
echo RAED FINANCE SUITE - FINAL FULL TESTS
echo Keep Start Raed Finance.bat running in the other window
echo for the live-service checks near the end.
echo =====================================================
echo.

echo [1/8] Python and Node syntax checks...
%PY% -m compileall -q launcher apps\etf-analysis tests
if errorlevel 1 goto :failed
node --check apps\stock-comparison-tool\server.js
if errorlevel 1 goto :failed

echo [2/8] Production builds for both React apps...
pushd apps\investment-calculator
call npm.cmd run build
if errorlevel 1 (popd & goto :failed)
popd
pushd apps\stock-comparison-tool
call npm.cmd run build
if errorlevel 1 (popd & goto :failed)
popd

echo [3/8] Investment calculation formula tests...
node tests\investment_formula_test.mjs
if errorlevel 1 goto :failed

echo [4/8] Static UI, language, launcher and optimization checks...
%PY% tests\static_ui_test.py
if errorlevel 1 goto :failed

echo [5/8] Final regression and input-validation audit...
%PY% tests\final_regression_test.py
if errorlevel 1 goto :failed

echo [6/8] Offline ETF backend caching/persistence/API tests...
%PY% tests\etf_backend_unit_test.py
if errorlevel 1 goto :failed

echo [7/8] Exhaustive offline ETF API regression tests...
%PY% tests\etf_api_regression_test.py
if errorlevel 1 goto :failed

echo [8/8] Live local-service and external market-data checks...
%PY% tests\full_project_test.py
if errorlevel 1 goto :failed

echo.
echo =====================================================
echo ALL CORE TESTS PASSED.
echo External Yahoo/provider warnings are reported separately.
echo =====================================================
goto :end

:missingdeps
echo.
echo ERROR: Required dependencies are not installed.
echo Run Start Raed Finance.bat first and let setup finish, then run this test.
echo.
goto :failed

:failed
echo.
echo =====================================================
echo TEST FAILURE. Read the failing line above.
echo =====================================================
exit /b 1

:end
echo.
pause
exit /b 0
