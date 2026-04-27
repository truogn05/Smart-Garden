#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// WiFi Configuration
#ifndef WIFI_SSID
#define WIFI_SSID "SmartGarden"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "garden2024"
#endif

// MQTT Configuration
#ifndef MQTT_BROKER
#define MQTT_BROKER "localhost"
#endif

#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif

#ifndef MQTT_CLIENT_ID
#define MQTT_CLIENT_ID "smartgarden_esp32"
#endif

// Device Configuration
#ifndef DEVICE_TYPE
#define DEVICE_TYPE "water_pump"
#endif

// MQTT Topics
#define TOPIC_BASE "smartgarden"
#define TOPIC_SENSOR_WEATHER TOPIC_BASE "/+/sensor/weather"
#define TOPIC_SENSOR_SOIL TOPIC_BASE "/+/sensor/soil"
#define TOPIC_PUMP_STATUS TOPIC_BASE "/+/pump/status"
#define TOPIC_PUMP_COMMAND TOPIC_BASE "/+/pump/command"

// QoS Levels
#define QOS_TELEMETRY 0
#define QOS_COMMAND 1

// Timing
#define MQTT_RECONNECT_INITIAL_MS 1000
#define MQTT_RECONNECT_MAX_MS 60000
#define HEARTBEAT_INTERVAL_MS 60000

// Buffer Sizes
#define MQTT_BUFFER_SIZE 1024
#define JSON_DOC_SIZE 512

#endif // CONFIG_H