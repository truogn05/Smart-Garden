import { useState } from 'react';
import type { PumpStatus } from '../hooks/useSSE';

const DEVICE_CODE = 'PUMP_001';
const API_BASE = import.meta.env.VITE_API_URL || '';

function formatRemaining(sec: number) {
  if (sec <= 0) return 'Idle';
  if (sec >= 60) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${sec}s`;
}

export function PumpButton({ pumpStatus }: { pumpStatus: PumpStatus | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRunning = pumpStatus?.running ?? false;
  const remaining = pumpStatus?.remaining ?? 0;

  async function startPump() {
    setError('');
    setLoading(true);
    try {
      const cmdId = crypto.randomUUID();
      const res = await fetch(`${API_BASE}/api/pump/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ device_code: DEVICE_CODE, duration: 90, cmd_id: cmdId }),
      });
      if (!res.ok) throw new Error('Failed to start pump');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="control-card">
      <div className="control-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24"/>
        </svg>
      </div>
      <div className="control-body">
        <div className="control-label">Water Pump</div>
        <div className="control-status">
          {isRunning ? (
            <span className="status-running">Running — {formatRemaining(remaining)}</span>
          ) : (
            <span className="status-idle">Idle</span>
          )}
        </div>
      </div>
      <button
        className={`btn-pump ${isRunning ? 'btn-pump--running' : ''}`}
        onClick={startPump}
        disabled={loading || isRunning}
      >
        {loading ? '...' : isRunning ? 'Watering...' : 'Start Pump'}
      </button>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}