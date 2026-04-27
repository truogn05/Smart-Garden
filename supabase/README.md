# Supabase

Backend-as-a-service: PostgreSQL database, Edge Functions, Auth.

## Structure

- `functions/` – Edge Function source (devices-register, pump-command, weather-latest, etc.)
- `migrations/` – PostgreSQL schema migrations

## Features Used

- **Edge Functions**: Globally distributed serverless functions
- **JWT Auth**: Email/password, passwordless, OAuth login providers
- **PostgreSQL**: Full database with RLS policies, realtime subscriptions
- **Database Webhooks**: Trigger functions on data changes

## Features Used

- **Edge Functions**: Globally distributed serverless functions
- **JWT Auth**: Email/password, passwordless, OAuth login providers
- **PostgreSQL**: Full database with RLS policies, realtime subscriptions
- **Database Webhooks**: Trigger functions on data changes

## Deploy

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy
```
