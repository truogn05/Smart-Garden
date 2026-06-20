import { useState, useEffect } from 'react';
import { useSensorData } from '../hooks/useSensorData';
import { DEFAULT_PUMP_CODE, API_BASE } from '../config';
import { Droplets, Play, History, TrendingUp, Minus, CheckCircle, AlertTriangle } from 'lucide-react';

interface PumpEvent {
  id: string;
  device_code: string;
  action: string;
  duration: number;
  cmd_id: string;
  created_at: string;
}

export function WateringPage() {
  const { sensor, pump, devices } = useSensorData();
  const [duration, setDuration] = useState(15);
  const [wateringLoading, setWateringLoading] = useState(false);
  const [wateringError, setWateringError] = useState('');

  // Real history from database
  const [historyEvents, setHistoryEvents] = useState<PumpEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Dynamic tank level (simulated depletion when pump runs)
  const [tankLevel, setTankLevel] = useState(82);

  // Dynamic flow rate fluctuation
  const [flowRate, setFlowRate] = useState(0.0);

  const pumpDevice = devices.find(d => d.device_type === 'pump');
  const pumpCode = pumpDevice?.device_code || DEFAULT_PUMP_CODE;

  // Fetch pump events history
  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/pump/history?device=${pumpCode}&limit=4`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryEvents(data);
      }
    } catch (err) {
      console.error('[WateringPage] Failed to fetch pump history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [pumpCode, pump?.running]);

  // Tank depletion and flow rate simulation
  useEffect(() => {
    let flowTimer: ReturnType<typeof setInterval> | null = null;
    let tankTimer: ReturnType<typeof setInterval> | null = null;

    if (pump?.running) {
      // Simulate water flow rate starting and fluctuating around 2.4 L/min
      setFlowRate(+(2.3 + Math.random() * 0.2).toFixed(1));
      flowTimer = setInterval(() => {
        setFlowRate(+(2.3 + Math.random() * 0.2).toFixed(1));
      }, 2000);

      // Simulate tank water depletion (0.05% per second)
      tankTimer = setInterval(() => {
        setTankLevel(prev => Math.max(12, +(prev - 0.05).toFixed(2)));
      }, 1000);
    } else {
      setFlowRate(0.0);
      // Slowly replenish tank (simulating refill)
      tankTimer = setInterval(() => {
        setTankLevel(prev => Math.min(95, +(prev + 0.01).toFixed(2)));
      }, 5000);
    }

    return () => {
      if (flowTimer) clearInterval(flowTimer);
      if (tankTimer) clearInterval(tankTimer);
    };
  }, [pump?.running]);

  async function triggerManualWatering() {
    if (wateringLoading) return;
    setWateringError('');
    setWateringLoading(true);
    try {
      const cmdId = crypto.randomUUID();
      const durationSec = duration * 60; // convert minutes to seconds
      
      const res = await fetch(`${API_BASE}/api/pump/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          device_code: pumpCode,
          duration: durationSec,
          cmd_id: cmdId
        }),
      });
      if (!res.ok) throw new Error('Failed to trigger watering');
      // Refresh history immediately
      setTimeout(loadHistory, 800);
    } catch (err) {
      setWateringError(err instanceof Error ? err.message : 'Error starting pump');
    } finally {
      setWateringLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-12 pb-24">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Hydration Control</h1>
          <p className="text-on-surface-variant font-body-md max-w-md">
            Precision management of the irrigation systems in Greenhouse Alpha. Monitor flow rates and trigger manual cycles.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-surface-container-high px-4 py-2 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse" />
            <span className="font-label-md text-label-md text-primary">System Online</span>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Active Pump Display */}
        <div className="md:col-span-8 glass-card rounded-lg p-10 flex flex-col relative overflow-hidden water-glow group">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary-container/5 blur-3xl group-hover:bg-primary-container/10 transition-colors duration-1000" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-12">
              <div>
                <span className="font-label-md text-label-md text-primary uppercase tracking-widest block mb-1">Current Status</span>
                <div className="flex items-center gap-3">
                  <h2 className="font-display-lg text-display-lg text-primary">
                    {pump?.running ? 'Active' : 'Idle'}
                  </h2>
                  <Droplets size={40} className="text-on-tertiary-container" style={pump?.running ? { fill: 'currentColor' } : {}} />
                </div>
              </div>
              <div className="text-right">
                <span className="font-label-md text-label-md text-on-surface-variant block mb-1">Flow Rate</span>
                <span className="font-data-display text-data-display text-primary">{flowRate.toFixed(1)} <span className="font-body-md">L/min</span></span>
              </div>
            </div>

            {/* Fluid Visual */}
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="relative w-full h-48 bg-surface-container rounded-xl overflow-hidden border border-outline-variant/30">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary-container/20 to-primary/5" />
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-on-tertiary-container/20 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex gap-4 items-end h-full px-12 py-4 w-full">
                    {(pump?.running ? [70, 90, 55, 80, 95, 65] : [15, 15, 15, 15, 15, 15]).map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 bg-on-tertiary-container/40 rounded-t-lg transition-all duration-700 ${pump?.running ? 'animate-pulse' : ''}`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="w-full md:w-1/2">
                <label className="font-label-md text-label-md text-on-surface-variant mb-4 block">Set Cycle Duration (0 — 30 min)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="flex-1 accent-primary h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="font-label-md text-primary min-w-[40px]">{duration}m</span>
                </div>
                {wateringError && (
                  <p className="text-error text-xs font-bold mt-2">{wateringError}</p>
                )}
              </div>
              <button
                onClick={triggerManualWatering}
                disabled={wateringLoading || pump?.running}
                className="w-full md:w-auto px-12 py-4 bg-primary text-on-primary disabled:opacity-50 rounded-full font-label-md flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/10"
              >
                <Play size={20} style={{ fill: 'currentColor' }} />
                {wateringLoading ? 'Sending...' : pump?.running ? 'Watering...' : 'Manual Trigger'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="md:col-span-4 space-y-8">
          {/* Sensor Summary */}
          <div className="glass-card rounded-lg p-6 flex items-center justify-between">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Avg Soil Moisture</p>
              <p className="font-data-display text-[28px] text-primary">{sensor?.soil_moisture ?? '--'}%</p>
            </div>
            {sensor?.soil_moisture !== undefined && sensor.soil_moisture < 25 ? (
              <div className="w-12 h-12 rounded-full bg-error-container/30 flex items-center justify-center text-error">
                <AlertTriangle size={24} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <CheckCircle size={24} />
              </div>
            )}
          </div>

          {/* Activation History */}
          <div className="glass-card rounded-lg p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-headline-md text-headline-md text-primary">History</h3>
              <button className="text-on-surface-variant hover:text-primary transition-colors" onClick={loadHistory}>
                <History size={20} />
              </button>
            </div>
            <div className="flex-1 space-y-8 relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-[1px] bg-outline-variant/50" />
              {historyLoading ? (
                <div className="animate-pulse space-y-6">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <div className="w-6 h-6 rounded-full bg-surface-container shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-surface-container rounded w-1/2" />
                        <div className="h-3 bg-surface-container rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : historyEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant/60 font-label-md text-xs">
                  <History size={32} className="opacity-40 mb-2" />
                  Không có dữ liệu lịch sử tưới
                </div>
              ) : (
                historyEvents.map((evt, i) => {
                  const date = new Date(evt.created_at);
                  const timeStr = date.toLocaleString('vi-VN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const mins = Math.round((evt.duration ?? 0) / 60);
                  return (
                    <div key={evt.id || i} className="relative pl-10">
                      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-surface-container flex items-center justify-center z-10">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <p className="font-label-md text-label-md text-primary font-semibold">Manual Trigger (User)</p>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-1">{timeStr} • {mins}m duration</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Environmental Insights */}
        <div className="md:col-span-12 glass-card rounded-lg p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-2 border-r border-outline-variant/20 pr-8">
            <span className="font-label-md text-label-md text-on-surface-variant">Humidity</span>
            <div className="flex items-end gap-2">
              <span className="font-data-display text-data-display text-primary">{sensor?.humidity ?? '--'}%</span>
              <TrendingUp size={18} className="text-on-tertiary-container mb-2" />
            </div>
          </div>
          <div className="flex flex-col gap-2 border-r border-outline-variant/20 pr-8">
            <span className="font-label-md text-label-md text-on-surface-variant">Temp</span>
            <div className="flex items-end gap-2">
              <span className="font-data-display text-data-display text-primary">{sensor?.temp ?? '--'}°C</span>
              <Minus size={18} className="text-secondary mb-2" />
            </div>
          </div>
          <div className="flex flex-col gap-2 border-r border-outline-variant/20 pr-8">
            <span className="font-label-md text-label-md text-on-surface-variant">PH Level</span>
            <div className="flex items-end gap-2">
              <span className="font-data-display text-data-display text-primary">
                {pump?.running ? (6.7 + (Math.sin(Date.now() / 5000) * 0.1)).toFixed(1) : '6.8'}
              </span>
              <CheckCircle size={18} className="text-on-tertiary-container mb-2" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-label-md text-label-md text-on-surface-variant">Tank Level</span>
            <div className="flex items-end gap-2">
              <span className="font-data-display text-data-display text-primary">{Math.round(tankLevel)}%</span>
              <div className="w-20 h-2 bg-surface-container rounded-full mb-3 overflow-hidden">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${tankLevel}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Image */}
      <section>
        <div className="relative w-full h-80 rounded-xl overflow-hidden group">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDNZbSuj4Hb4aCi9L6cfJiliBmS-Ehftv3WOHDaqyu1tEOE8hDb9EGoceURk8ClHi18EaOAiFzjqxLcNFP789QRxDoUrkj5drsQ0_cBT0Jonl66NYrAv10ZIy-fk8dPpohVXm2e1Eu_q02luhhCu2yRUfogYwFU5wIJEIs67zMK3Zb_HEvQe07YrdXv7SS_MdgKU-tT9hdHCfarL8p3ST0jgVK2kqXi-bIAJBRjfL25GyOB-m5lUISK-uZPwHpGr3G1tTdQeTT6P_H"
            alt="Greenhouse"
            className="w-full h-full object-cover grayscale-[0.2] group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
          <div className="absolute bottom-8 left-8 text-on-primary">
            <h3 className="font-headline-md text-headline-md">Botanical Harmony</h3>
            <p className="font-body-md opacity-90 max-w-sm">Automated systems working in sync with nature's inherent rhythms.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
