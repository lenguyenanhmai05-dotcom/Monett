@echo off
chcp 65001 >nul
echo ========================================================
echo   KHOI DONG MONETT (CHONG LOI PORT ^& VUOT TUONG LUA)
echo ========================================================
echo.

echo [1/3] Dang don dep cac ung dung dang treo (Giai phong Port 8081)...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Dang tao duong ham (Tunnel) cho Backend...
set SUBDOMAIN=monett-api-%RANDOM%
echo Dia chi Backend API la: https://%SUBDOMAIN%.loca.lt

echo EXPO_PUBLIC_GOOGLE_CLIENT_ID="1021394635401-hve4dh39kdm8a1fd4klbia5i8ohrt17a.apps.googleusercontent.com" > apps\mobile-web\.env
echo EXPO_PUBLIC_PROXY_REDIRECT_URI="https://auth.expo.io/@vy098s-team/monett-app" >> apps\mobile-web\.env
echo EXPO_PUBLIC_API_URL="https://%SUBDOMAIN%.loca.lt" >> apps\mobile-web\.env

echo.
echo [3/3] Dang khoi dong Backend, Backend Tunnel, va Mobile...
echo (Vui long khong tat 3 cua so den vua hien ra nhe!)
echo.

:: Mo Backend o cua so thu 1
start "Monett Backend" cmd /c "npm run dev:backend"

:: Mo Backend Tunnel o cua so thu 2
start "Monett API Tunnel" cmd /c "npx localtunnel --port 3000 --subdomain %SUBDOMAIN%"

:: Mo Mobile (Tunnel) o cua so thu 3
start "Monett Mobile" cmd /c "npm run start:tunnel --workspace=@monett/mobile-web -c"

echo Xong! Da khoi dong thanh cong tat ca.
pause


