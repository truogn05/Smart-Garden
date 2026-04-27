# Firmware

ESP32 device firmware built with PlatformIO.

## Structure

- `src/` – device source files (sensor, pump)
- `include/` – shared headers
- `lib/` – shared libraries (MqttManager, WifiProvisioner, SensorReader, PumpController)

## Dependencies

- **PubSubClient** (knolleary/pubsubclient) – MQTT client for ESP32
  - QoS: publishes at QoS 0 only, subscribes at QoS 0 or QoS 1
  - Max message size: 256 bytes default (configurable via `MQTT_MAX_PACKET_SIZE`)
  - Keepalive: 15 seconds default (configurable via `MQTT_KEEPALIVE`)
- **DHT sensor library** – for DHT22 temperature/humidity
- **Preferences** – ESP32 non-volatile storage (built-in)

## Dependencies

- **PubSubClient** (knolleary/pubsubclient) – MQTT client for ESP32
  - QoS: publishes at QoS 0 only, subscribes at QoS 0 or QoS 1
  - Max message size: 256 bytes default (configurable via `MQTT_MAX_PACKET_SIZE`)
  - Keepalive: 15 seconds default (configurable via `MQTT_KEEPALIVE`)
- **DHT sensor library** – for DHT22 temperature/humidity
- **Preferences** – ESP32 non-volatile storage (built-in)

## Build

```bash
cd firmware
pio run
```
