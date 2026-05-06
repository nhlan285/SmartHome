# Project Structure

```text
src/
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

## Root Files

- `App.tsx`: entry component, wraps navigation and light schedule provider.
- `app.json`: Expo app configuration.
- `babel.config.js`: Expo Babel preset and alias `@ -> src`.
- `tsconfig.json`: TypeScript strict configuration and path alias.
- `package.json`: scripts, dependencies and repository metadata.
- `package-lock.json`: locked npm dependency graph.
- `ESP32_PBL5.cpp`: reference firmware for ESP32 smart home controller.
- `WBS.md`: work breakdown structure and delivery plan.

## `src/components`

Reusable UI components:

- `DeviceCard.tsx`: device row/card with ON/OFF toggle.
- `HistoryList.tsx`: control history table/list.
- `SensorPanel.tsx`: temperature, humidity and gas panel.
- `VoiceCommandResultCard.tsx`: voice command result display.

## `src/config`

- `env.ts`: single place for backend URL, ESP32 URL, WebSocket URL, mock mode and API paths.

## `src/context`

- `LightScheduleContext.tsx`: app-level light scheduler CRUD, local persistence and execution logic.

## `src/hooks`

- `useDeviceSocket.ts`: reusable hook around `DeviceSocket`.
- `useVoiceRecorder.ts`: reusable voice recording hook using Expo AV.

## `src/navigation`

- `AppNavigator.tsx`: native stack navigation and route types.

## `src/screens`

Main screens:

- `DashboardScreen.tsx`: realtime dashboard, sensors, devices, gas alert.
- `ControlScreen.tsx`: manual room/device ON/OFF control.
- `VoiceScreen.tsx`: hold-to-talk voice flow with local mock parser.
- `HistoryScreen.tsx`: backend/manual command history.
- `ScheduleScreen.tsx`: light schedule CRUD, enable/disable and run-now actions.

Legacy/alternate screens kept for reference:

- `HomeScreen.tsx`
- `VoiceControlScreen.tsx`

## `src/services`

- `api/`: backend and ESP32 API adapters.
- `http/`: Axios clients.
- `mock/`: mock dashboard, voice and history data.
- `realtime/`: WebSocket services.
- `schedule/`: light schedule model, defaults, validation and sorting helpers.

## `src/styles`

- `theme.ts`: shared colors, spacing and radius values.

## `src/types`

- `models.ts`: domain models for device, sensor, history and voice data.

## `src/utils`

- `format.ts`: small formatting helpers.
