@echo off
cd /d "%~dp0"

rem 👇 頭に call を追加します
call npm install
echo.

rem 👇 ここにも call を追加します
call npm run build
echo.

if %ERRORLEVEL% == 0 (
    echo Build Success! Upload dist folder to Netlify.
) else (
    echo Build Failed! Copy error message and send to Claude.
)
echo.
pause