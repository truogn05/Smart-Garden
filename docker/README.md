# Docker

Local development infrastructure.

## Services

- **Mosquitto** – local MQTT broker for dev testing
- **Deno MQTT Bridge** – connects ESP32 MQTT to Supabase Edge Functions
- **(optional) PostgreSQL** – local Supabase-compatible DB for migrations testing

## Deno Bridge

Build and run locally:
```bash
cd bridge
deno serve --allow-net --allow-env bridge.ts
```

Deploy to Deno Deploy:
```bash
deno deploy --project YOUR_PROJECT bridge.ts
```

## Start

```bash
docker compose up -d
```

## Mosquitto Config

Ports: 1883 (MQTT), 9001 (WebSocket)
