import { useState } from 'react';

const DEVICE_CODE = 'SENSOR_001';
const API_BASE = import.meta.env.VITE_API_URL || '';

export function ResetButton() {
  const [stage, setStage] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleReset() {
    setError('');
    setStage('loading');
    try {
      // Step 1: init — get reset token from server
      const initRes = await fetch(`${API_BASE}/api/devices/${DEVICE_CODE}/reset/init`, {
        credentials: 'include',
      });
      if (!initRes.ok) throw new Error('Failed to init reset');
      const { token } = await initRes.json();

      // Step 2: confirm — send token to trigger MQTT reset command
      const res = await fetch(`${API_BASE}/api/devices/${DEVICE_CODE}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error('Failed to reset device');
      setStage('done');
      setTimeout(() => setStage('idle'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setStage('error');
      setTimeout(() => setStage('idle'), 3000);
    }
  }

  return (
    <div className="control-card control-card--secondary">
      <div className="control-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      </div>
      <div className="control-body">
        <div className="control-label">WiFi Reset</div>
        <div className="control-desc">Clear ESP32 stored credentials</div>
      </div>
      <button
        className={`btn-reset ${stage === 'done' ? 'btn-reset--done' : ''} ${stage === 'error' ? 'btn-reset--error' : ''}`}
        onClick={handleReset}
        disabled={stage === 'loading' || stage === 'done'}
      >
        {stage === 'loading' ? '...' : stage === 'done' ? 'Reset sent!' : 'Reset WiFi'}
      </button>
      {stage === 'error' && <div className="form-error">{error}</div>}
    </div>
  );
}