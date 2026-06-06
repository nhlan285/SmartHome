# Demo Checklist

Use this checklist before presenting the project.

## 1. Local Setup

- Run `npm install`.
- Run `npm run typecheck`.
- Confirm `src/config/env.ts` points to `https://dean-habitat-eatable.ngrok-free.dev`.
- Confirm phone/emulator and ESP32 are on the same network.
- Confirm backend AI/history server is running.

## 2. ESP32 REST API

Check state:

```powershell
Invoke-RestMethod http://172.20.10.3/state
```

Turn living room light on:

```powershell
Invoke-RestMethod "http://172.20.10.3/control?room=living&device=light&action=ON"
```

Turn living room light off:

```powershell
Invoke-RestMethod "http://172.20.10.3/control?room=living&device=light&action=OFF"
```

## 3. WebSocket

```powershell
npx wscat -c ws://172.20.10.3:81
```

Expected:

- Connection opens.
- ESP32 sends JSON state updates when sensor/device state changes.

## 4. Backend

History:

```powershell
Invoke-RestMethod https://dean-habitat-eatable.ngrok-free.dev/api/history -Headers @{"ngrok-skip-browser-warning"="true"}
```

Voice:

```powershell
curl.exe -X POST "https://dean-habitat-eatable.ngrok-free.dev/api/voice-audio" -H "ngrok-skip-browser-warning: true" -F "file=@sample.m4a;type=audio/m4a"
```

If the upload is `.m4a`, confirm the server has `ffmpeg` installed for WAV conversion.

## 5. Mobile App Flow

- Open Dashboard.
- Confirm temperature, humidity, gas and devices render.
- Open Control.
- Turn one light ON and OFF.
- Return to Dashboard and confirm status changed.
- Open Schedule.
- Press `Chay ngay` on each schedule to confirm commands work.
- Press `+ Them` and create a new schedule.
- Edit the new schedule time/target/action.
- Delete the new schedule.
- Toggle one schedule off and on.
- Open Voice.
- Record a command and confirm transcript/result displays.
- Open History.
- Press Refresh and confirm history loads.

## 6. Gas Warning

- Raise gas value from ESP32 or mock data.
- Confirm Dashboard warning banner appears.
- Confirm warning modal appears.
- Confirm Control screen warning appears.

## 7. Common Issues

- `Device request failed`: check ESP32 IP, Wi-Fi and `/state`.
- `Backend request failed`: check backend server and `BACKEND_BASE_URL`.
- WebSocket disconnected: check `BACKEND_WS_URL` and `/ws`.
- Voice upload fails: check microphone permission, backend endpoint and multipart parser.
- Schedule does not trigger: keep the app open/active, because the current scheduler runs inside the mobile app.
