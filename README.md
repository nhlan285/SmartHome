# Smart Home Voice Mobile

Ứng dụng mobile điều khiển nhà thông minh bằng giọng nói, xây dựng bằng Expo, React Native và TypeScript. Ứng dụng kết nối với ESP32 để đọc trạng thái thiết bị/cảm biến, điều khiển đèn/quạt/cửa, nhận dữ liệu realtime qua WebSocket, gửi voice command lên backend AI và xem lịch sử điều khiển.

## Tính Năng Chính

- Dashboard realtime: nhiệt độ, độ ẩm, gas và trạng thái thiết bị.
- Điều khiển thiết bị thủ công qua ESP32 HTTP API `/control`.
- Ghi âm giọng nói và gửi file âm thanh lên backend AI.
- Hiển thị lịch sử điều khiển từ backend.
- Cảnh báo khí gas trên Dashboard và Control khi vượt ngưỡng.
- Hẹn giờ bật/tắt đèn:
  - 05:00 bật đèn phòng khách.
  - 06:00 bật đèn phòng ngủ.
  - 18:00 bật toàn bộ đèn.
  - 22:00 tắt toàn bộ đèn.

Lưu ý: chế độ hẹn giờ hiện chạy ở tầng mobile app, nên app cần đang mở/active để tự gửi lệnh đúng giờ. Nếu muốn lịch vẫn chạy khi tắt app, nên chuyển scheduler xuống backend hoặc ESP32.

## Công Nghệ

- Expo `~52`
- React Native `0.76`
- React `18`
- TypeScript strict mode
- React Navigation native stack
- Axios
- Expo AV cho ghi âm
- ESP32 HTTP API và WebSocket

## Cấu Trúc Thư Mục

```text
.
├── App.tsx
├── ESP32_PBL5.cpp
├── app.json
├── babel.config.js
├── package.json
├── tsconfig.json
├── docs/
│   ├── API_CONTRACT.md
│   ├── DEMO_CHECKLIST.md
│   └── PROJECT_STRUCTURE.md
└── src/
    ├── components/
    ├── config/
    ├── context/
    ├── hooks/
    ├── navigation/
    ├── screens/
    ├── services/
    ├── styles/
    ├── types/
    └── utils/
```

Chi tiết từng thư mục nằm trong [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

## Cài Đặt

```powershell
npm install
```

## Cấu Hình Endpoint

Chỉnh file [src/config/env.ts](src/config/env.ts):

```ts
export const ENV = {
  BACKEND_BASE_URL: 'http://172.20.10.4:8000',
  ESP32_BASE_URL: 'http://172.20.10.3',
  DEVICE_WS_URL: 'ws://172.20.10.3:81',
  USE_MOCKS: false
} as const;
```

- `BACKEND_BASE_URL`: backend AI/history.
- `ESP32_BASE_URL`: HTTP API của ESP32.
- `DEVICE_WS_URL`: WebSocket realtime của ESP32.
- `USE_MOCKS`: `true` để test UI bằng mock, `false` để gọi thiết bị thật.

## Cấu Hình Firmware ESP32

File [ESP32_PBL5.cpp](ESP32_PBL5.cpp) dùng `ESP32_secrets.h` cho Wi-Fi, MQTT và backend URL. Tạo file local từ mẫu:

```powershell
Copy-Item ESP32_secrets.example.h ESP32_secrets.h
```

Sau đó sửa `ESP32_secrets.h` theo mạng thật của bạn. File này đã được `.gitignore` để không đẩy mật khẩu Wi-Fi lên GitHub.

## Chạy Dự Án

```powershell
npm start
```

Chạy Android:

```powershell
npm run android
```

Chạy web bằng Expo:

```powershell
npm run web
```

## Kiểm Tra

Typecheck:

```powershell
npm run typecheck
```

Kiểm tra ESP32:

```powershell
Invoke-RestMethod http://172.20.10.3/state
Invoke-RestMethod "http://172.20.10.3/control?room=living&device=light&action=ON"
Invoke-RestMethod "http://172.20.10.3/control?room=living&device=light&action=OFF"
```

Kiểm tra backend:

```powershell
Invoke-RestMethod http://172.20.10.4:8000/api/history
curl.exe -X POST "http://172.20.10.4:8000/api/voice/process" -F "audio=@sample.m4a;type=audio/m4a"
```

Kiểm tra WebSocket:

```powershell
npx wscat -c ws://172.20.10.3:81
```

## Luồng Demo Gợi Ý

1. Mở Dashboard để kiểm tra dữ liệu cảm biến và trạng thái thiết bị.
2. Vào Control, bật/tắt một đèn để kiểm tra `/control`.
3. Vào Schedule, bấm `Chay ngay` một lịch để test hẹn giờ.
4. Vào Voice, giữ nút ghi âm và thả để xử lý lệnh.
5. Vào History, refresh lịch sử điều khiển.
6. Test gas warning bằng dữ liệu gas cao từ ESP32 hoặc mock.

Checklist chi tiết nằm trong [docs/DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md).

## Ghi Chú Repo

- Không commit `node_modules`, `.expo`, `.idea`, build output hoặc file log.
- `package-lock.json` được commit để giữ dependency ổn định.
- Firmware ESP32 tham khảo nằm ở [ESP32_PBL5.cpp](ESP32_PBL5.cpp).
