# API Contract

This document describes the API shape expected by the mobile app.

## Environment

Edit [src/config/env.ts](../src/config/env.ts):

```ts
export const ENV = {
  BACKEND_BASE_URL: 'http://172.20.10.4:8000',
  ESP32_BASE_URL: 'http://172.20.10.3',
  DEVICE_WS_URL: 'ws://172.20.10.3:81',
  USE_MOCKS: false
} as const;
```

## ESP32 State

Request:

```http
GET /state
```

Expected payload:

```json
{
  "living": {
    "light": true,
    "fan": false,
    "door": false
  },
  "bedroom": {
    "light": false,
    "fan": true,
    "door": false
  },
  "kitchen": {
    "light": true,
    "fan": false,
    "door": false
  },
  "hallway": {
    "light": false
  },
  "sensors": {
    "temperature": 27.2,
    "humidity": 56.4,
    "gas": 201
  }
}
```

The app also accepts an already-normalized `DashboardSnapshot`:

```json
{
  "devices": [
    {
      "deviceId": "light-living-room",
      "name": "Living Room Light",
      "status": "on",
      "updatedAt": "2026-05-06T12:00:00.000Z"
    }
  ],
  "sensors": {
    "temperatureC": 27.2,
    "humidityPercent": 56.4,
    "gasPpm": 201,
    "updatedAt": "2026-05-06T12:00:00.000Z"
  }
}
```

## ESP32 Control

Request:

```http
POST /control?room=living&device=light&action=ON
```

Fallback request:

```http
GET /control?room=living&device=light&action=ON
```

Supported values:

| Field | Values |
| --- | --- |
| `room` | `living`, `bedroom`, `kitchen`, `hallway` |
| `device` | `light`, `fan`, `door` |
| `action` | `ON`, `OFF` |

## ESP32 WebSocket

URL:

```text
ws://<esp32-ip>:81
```

Message payload should match the `/state` payload. The app maps each message through `mapStatePayloadToDashboardSnapshot`.

## Backend Voice API

Request:

```http
POST /api/voice/process
Content-Type: multipart/form-data
```

Form field:

```text
audio=<voice-command.m4a>
```

Expected response:

```json
{
  "transcript": "Turn on living room light",
  "intent": "device_control",
  "confidence": 0.95,
  "entities": {
    "deviceId": "light-living-room",
    "action": "on"
  },
  "suggestedAction": "Switch Living Room Light on"
}
```

## Backend History API

Request:

```http
GET /api/history
```

Expected response:

```json
[
  {
    "id": "hist-1",
    "source": "voice",
    "commandText": "Turn on living room light",
    "status": "success",
    "timestamp": "2026-05-06T12:00:00.000Z"
  }
]
```

## Backend History Log

Optional request used by legacy `HomeScreen` flow:

```http
POST /api/history/log
Content-Type: application/json
```

Payload:

```json
{
  "deviceId": "light-living-room",
  "action": "on"
}
```
