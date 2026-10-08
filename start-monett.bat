@echo off
chcp 65001 >nul
echo ========================================================
echo   KHOI DONG MONETT (CHONG LOI PORT ^& VUOT TUONG LUA)
echo ========================================================
echo.

echo [1/3] Dang don dep cac ung dung dang treo (Giai phong Port 8081) va xoa Cache...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Monett Backend" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Monett API Tunnel" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Monett Mobile" >nul 2>&1
rmdir /s /q apps\mobile-web\.expo >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Dang tao duong ham (Tunnel) cho Backend...
set SUBDOMAIN=monett-api-%RANDOM%
echo Dia chi Backend API la: https://%SUBDOMAIN%.loca.lt

echo EXPO_PUBLIC_GOOGLE_CLIENT_ID="<HIDDEN_CLIENT_ID>" > apps\mobile-web\.env
echo EXPO_PUBLIC_PROXY_REDIRECT_URI="https://auth.expo.io/@vy098s-team/monett-app" >> apps\mobile-web\.env
echo EXPO_PUBLIC_API_URL="https://%SUBDOMAIN%.loca.lt" >> apps\mobile-web\.env

echo.
echo [3/3] Dang khoi dong Backend, Backend Tunnel, va Mobile...
echo (Vui long khong tat 3 cua so den vua hien ra nhe!)
echo.

:: Mo Backend o cua so thu 1
start "Monett Backend" cmd /k "npm run dev:backend"

:: Mo Backend Tunnel o cua so thu 2
start "Monett API Tunnel" cmd /k "npx localtunnel --port 3000 --subdomain %SUBDOMAIN%"

:: Mo Mobile o cua so thu 3 (Chay o che do LAN thay vi Tunnel do ngrok dang loi)
start "Monett Mobile" cmd /k "npm run start --workspace=@monett/mobile-web -- -c"

echo Xong! Da khoi dong thanh cong tat ca.
pause


