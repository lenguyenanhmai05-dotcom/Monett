@echo off
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    set IP=%%a
)
set IP=%IP: =%
echo EXPO_PUBLIC_API_URL="http://%IP%:3000" > .env.test
type .env.test
