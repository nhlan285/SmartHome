#pragma once

// Copy this file to ESP32_secrets.h and fill in your local values.
// ESP32_secrets.h is ignored by git so Wi-Fi credentials are not pushed.

#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

#define MQTT_SERVER "192.168.1.7"
#define MQTT_PORT 1883

#define BACKEND_SENSOR_URL "http://192.168.1.7:5000/api/sensor"
