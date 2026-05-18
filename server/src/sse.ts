/**
 * SSE client manager with heartbeat and stale-client cleanup.
 * Clients that miss 3 heartbeats (>90s) are pruned.
 */

import type { Response } from 'express';

const clients = new Map<Response, number>(); // res → lastSeen timestamp
const HEARTBEAT_MS = 30_000;
const STALE_THRESHOLD_MS = 90_000;

// Sweep stale clients every 30s
setInterval(() => {
  const now = Date.now();
  for (const [res, lastSeen] of clients) {
    if (now - lastSeen > STALE_THRESHOLD_MS) {
      if (!res.writableEnded) res.end();
      clients.delete(res);
    }
  }
}, HEARTBEAT_MS);

export function addClient(res: Response): void {
  clients.set(res, Date.now());
}

export function removeClient(res: Response): void {
  clients.delete(res);
}

export function broadcast(event: string, data: unknown): void {
  const now = Date.now();
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [res, lastSeen] of clients) {
    // Prune stale clients
    if (now - lastSeen > STALE_THRESHOLD_MS) {
      if (!res.writableEnded) res.end();
      clients.delete(res);
      continue;
    }
    if (!res.writableEnded) {
      try {
        res.write(payload);
        clients.set(res, now); // refresh heartbeat on activity
      } catch {
        clients.delete(res);
      }
    }
  }
}

export function getClientCount(): number {
  return clients.size;
}