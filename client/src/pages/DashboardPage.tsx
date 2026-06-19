import { useState, useEffect } from 'react';
import { useSensorData, type HistoryPoint } from '../hooks/useSensorData';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { DEFAULT_SENSOR_CODE, DEFAULT_PUMP_CODE, API_BASE } from '../config';
import { Thermometer, Droplets, Cloud, Play, WifiOff, Router, Network, Leaf, ChevronRight } from 'lucide-react';

function SkeletonValue({ className = '' }: { className?: string }) {
  return <div className={`bg-surface-variant animate-pulse rounded ${className}`} />;
}

/** Chuyển timestamp thành chuỗi "x phút trước" / "vừa xong" */
function timeAgo(ts: number | null): string {
  if (!ts) return 'Chưa có dữ liệu';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'Vừa xong';
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  return `${Math.floor(diff / 3600)} giờ trước`;
}

/** Tạo SVG path từ mảng giá trị */
function buildPath(points: (number | null)[], width = 400, height = 100): string {
  const valid = points.map((v, i) => ({ v, i })).filter(p => p.v !== null && p.v !== undefined);
  if (valid.length < 2) return '';
  const vals = valid.map(p => p.v as number);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const step = width / (valid.length - 1);
  return valid
    .map((p, idx) => {
      const x = idx * step;
      const y = height - ((p.v as number - min) / range) * (height * 0.85) - height * 0.07;
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Mini sparkline bar chart */
function BarChart({ points, color = '#2d6a4f' }: { points: (number | null)[]; color?: string }) {
  if (points.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-on-surface-variant font-label-md">
        Chưa có dữ liệu lịch sử
      </div>
    );
  }
  const vals = points.filter((v): v is number => v !== null);
  const max = Math.max(...vals, 1);
  return (
    <div className="h-48 flex items-end gap-1 px-2">
      {points.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-full transition-all hover:opacity-80"
          style={{
            height: `${v !== null ? Math.max(4, (v / max) * 100) : 2}%`,
            backgroundColor: v !== null ? color : '#e0e0e0',
            opacity: v !== null ? 0.7 + (i / points.length) * 0.3 : 0.2,
          }}
        />
      ))}
    </div>
  );
}

/** Line chart SVG */
function LineChart({ history, field, color = '#94492c' }: {
  history: HistoryPoint[];
  field: keyof Pick<HistoryPoint, 'soil_moisture' | 'temp' | 'humidity'>;
  color?: string;
}) {
  const points = history.map(h => h[field] as number | null);
  const path = buildPath(points);
  if (!path) {
    return (
      <div className="h-48 flex items-center justify-center text-on-surface-variant font-label-md">
        Chưa có dữ liệu lịch sử
      </div>
    );
  }
  const vals = points.filter((v): v is number => v !== null);
  const lastVal = vals[vals.length - 1];
  const lastPoint = (() => {
    const valid = points.map((v, i) => ({ v, i })).filter(p => p.v !== null);
    if (!valid.length) return null;
    const last = valid[valid.length - 1];
    const min = Math.min(...vals); const max = Math.max(...vals); const range = max - min || 1;
    const step = 400 / (valid.length - 1 || 1);
    return {
      x: (valid.length - 1) * step,
      y: 100 - ((last.v as number - min) / range) * 85 - 7,
    };
  })();

  return (
    <div className="h-48 relative border-b border-l border-outline-variant/30">
      <svg className="w-full h-full px-4" preserveAspectRatio="none" viewBox="0 0 400 100">
        <defs>
          <linearGradient id={`grad-${field}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {path && (
          <>
            <path d={`${path} L400,100 L0,100 Z`} fill={`url(#grad-${field})`} />
            <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeWidth="2.5" />
          </>
        )}
        {lastPoint && (
          <circle cx={lastPoint.x} cy={lastPoint.y} r="4.5" fill={color} />
        )}
      </svg>
      {lastVal !== undefined && (
        <div className="absolute top-2 right-4 font-label-md text-xs" style={{ color }}>
          {lastVal.toFixed(1)}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { sensor, pump, dryout, connection, lastUpdate, history, historyLoading, devices } = useSensorData();
  const [duration, setDuration] = useState(15);
  const [wateringLoading, setWateringLoading] = useState(false);
  const [wateringError, setWateringError] = useState('');

  // Ticker to force re-render every 10 seconds, updating timeAgo relative labels in real-time
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const loading = !sensor;

  const sensorDevice = devices.find(d => d.device_type === 'sensor');
  const pumpDevice = devices.find(d => d.device_type === 'pump');

  const sensorCode = sensorDevice?.device_code || DEFAULT_SENSOR_CODE;
  const pumpCode = pumpDevice?.device_code || DEFAULT_PUMP_CODE;

  async function startManualWatering() {
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
      if (!res.ok) throw new Error('Failed to start manual watering');
    } catch (err) {
      setWateringError(err instanceof Error ? err.message : 'Error starting pump');
    } finally {
      setWateringLoading(false);
    }
  }

  const weatherHistory = history.filter(h => h.temp !== null);
  const soilHistory = history.filter(h => h.soil_moisture !== null);

  const tempPoints = weatherHistory.map(h => h.temp).slice(-24);
  const soilPoints = soilHistory.map(h => h.soil_moisture).slice(-24);

  const lastUpdatedLabel = timeAgo(lastUpdate);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-12">
      {/* Welcome Header */}
      <section className="mb-4">
        <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Good morning.</h2>
        <div className="flex items-center gap-3 text-secondary">
          <Droplets size={20} style={{ fill: 'currentColor' }} />
          <p className="font-body-lg text-body-lg">
            {sensor?.soil_moisture !== null && sensor?.soil_moisture !== undefined && sensor.soil_moisture < 35
              ? 'The soil is thirsty. Immediate attention suggested for the Greenhouse.'
              : 'Your garden is thriving. All systems nominal.'}
          </p>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <ConnectionStatus state={connection} />
          {lastUpdate && (
            <span className="font-label-md text-label-md text-on-surface-variant text-sm">
              Cập nhật: {lastUpdatedLabel}
            </span>
          )}
        </div>
      </section>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Live Data Grid */}
        <div className="md:col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
          {/* Temp */}
          <div className="glass-card organic-shadow rounded-lg p-6 flex flex-col justify-between aspect-square">
            <Thermometer size={24} className="text-primary" />
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Temperature</p>
              {loading ? (
                <SkeletonValue className="h-9 w-20" />
              ) : (
                <>
                  <p className="font-data-display text-data-display">
                    {sensor?.temp !== undefined && sensor.temp !== 0 ? sensor.temp.toFixed(1) : '--'}°C
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-1 opacity-70">{lastUpdatedLabel}</p>
                </>
              )}
            </div>
          </div>
          {/* Humidity */}
          <div className="glass-card organic-shadow rounded-lg p-6 flex flex-col justify-between aspect-square">
            <Droplets size={24} className="text-primary" />
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Humidity</p>
              {loading ? (
                <SkeletonValue className="h-9 w-20" />
              ) : (
                <>
                  <p className="font-data-display text-data-display">
                    {sensor?.humidity !== undefined && sensor.humidity !== 0 ? sensor.humidity.toFixed(1) : '--'}%
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-1 opacity-70">{lastUpdatedLabel}</p>
                </>
              )}
            </div>
          </div>
          {/* Soil Moisture */}
          <div className={`glass-card organic-shadow rounded-lg p-6 flex flex-col justify-between aspect-square ${
            !loading && (sensor?.soil_moisture ?? 0) < 25 ? 'border-secondary/30 bg-secondary/5' : ''
          }`}>
            <Droplets size={24} className={((sensor?.soil_moisture ?? 0) < 25) ? 'text-secondary' : 'text-primary'} style={{ fill: 'currentColor' }} />
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Soil Moisture</p>
              {loading ? (
                <SkeletonValue className="h-9 w-20" />
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <p className="font-data-display text-data-display">
                      {sensor?.soil_moisture !== undefined && sensor.soil_moisture !== 0 ? sensor.soil_moisture : '--'}%
                    </p>
                    {(sensor?.soil_moisture ?? 0) < 25 && (
                      <span className="bg-secondary text-on-secondary px-2 py-0.5 rounded-full text-[10px] uppercase font-bold">Urgent</span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1 opacity-70">{lastUpdatedLabel}</p>
                </>
              )}
            </div>
          </div>
          {/* Rain/Status */}
          <div className="glass-card organic-shadow rounded-lg p-6 flex flex-col justify-between aspect-square">
            <Cloud size={24} className="text-primary" />
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Status</p>
              {loading ? (
                <SkeletonValue className="h-9 w-20" />
              ) : (
                <>
                  <p className="font-data-display text-data-display">{sensor?.rain ? 'Rain' : 'Dry'}</p>
                  {dryout?.hours && (
                    <p className="text-[11px] text-on-surface-variant mt-1 opacity-80">
                      Dự báo khô: <span className="font-bold text-secondary">{dryout.hours}h</span>
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pump Widget */}
        <div className="md:col-span-12 lg:col-span-8 glass-card organic-shadow rounded-lg p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-4 w-full">
            <div className="flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-primary">Irrigation Pump</h3>
              <span className={`bg-surface-container-higher px-4 py-1 rounded-full font-label-md font-semibold ${
                pump?.running ? 'text-tertiary-container bg-tertiary-container/20' : 'text-on-surface-variant'
              }`}>
                Status: {pump?.running ? 'Running' : 'Idle'}
              </span>
            </div>
            <div className="space-y-6 pt-4">
              <div className="flex justify-between text-on-surface-variant font-label-md">
                <span>Manual Duration</span>
                <span className="text-primary font-bold">{duration} Minutes</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary"
              />
              {pump?.running && pump.remaining > 0 && (
                <div className="flex items-center gap-2 text-tertiary-container">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse" />
                  <p className="font-label-md font-bold">Đang chạy — còn {pump.remaining}s</p>
                </div>
              )}
              {wateringError && (
                <p className="text-error text-xs font-bold">{wateringError}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">schedule</span>
                <p className="font-body-md">Next Schedule: <span className="font-bold">4:00 PM</span></p>
              </div>
            </div>
          </div>
          <button
            onClick={startManualWatering}
            disabled={wateringLoading || pump?.running}
            className="w-full md:w-48 aspect-square bg-primary text-on-primary disabled:opacity-50 rounded-xl flex flex-col items-center justify-center gap-4 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play size={36} style={{ fill: 'currentColor' }} />
            <span className="font-label-md text-center px-4">
              {wateringLoading ? 'Sending...' : pump?.running ? 'Watering...' : 'Start Manual Watering'}
            </span>
          </button>
        </div>

        {/* Camera Snapshot & Health Score */}
        <div className="md:col-span-12 lg:col-span-7 relative h-[450px] rounded-lg overflow-hidden organic-shadow group">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAB5kWZjLSB2sH3X1NehD0r8rfiy-ETiFLns8eBtUVTNGCd1wgeQ5OcEPhJVLzzcspho4CDGDSery1PbIdNazFEZeGTnDEMq8VgUXyCTjZay7yMts9KzvX2yZ8k0WZ2yfSEUFzgr9HQxjCGZRuzWdWUi0z5uXFAY2Q5RMKf-NXmpmy97YrlIEn1vSUM9uGvM2Xe7KnnHWVU1_L8AQHkvRlNq9QnvQ1Id3InKg5Wcvip5Be5WoJSenTy5ENZC0-BdJfwd5RjKdhPqzbe"
            alt="Garden Snapshot"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
          <div className="absolute top-6 left-6 glass-panel px-6 py-3 rounded-full flex items-center gap-3">
            <Leaf size={20} className="text-tertiary-fixed-dim" style={{ fill: 'currentColor' }} />
            <span className="font-label-md text-primary">
              AI Health Score:{' '}
              <span className="font-bold">
                {dryout?.confidence ? `${Math.round(dryout.confidence * 100)}/100` : '—'}
              </span>
            </span>
          </div>
          <div className="absolute bottom-6 left-6 text-white">
            <p className="font-label-md opacity-80">Last Updated</p>
            <p className="font-headline-md">{lastUpdatedLabel}</p>
          </div>
        </div>

        {/* Connected Devices */}
        <div className="md:col-span-12 lg:col-span-5 glass-card organic-shadow rounded-lg p-6 md:p-8 flex flex-col">
          <h3 className="font-headline-md text-headline-md text-primary mb-6">Network Nodes</h3>
          <div className="space-y-4 flex-1">
            {(() => {
              const displayDevices = devices.length > 0 ? devices : [
                { id: '1', device_code: DEFAULT_SENSOR_CODE, device_type: 'sensor', device_name: 'Garden Sensor' },
                { id: '2', device_code: DEFAULT_PUMP_CODE, device_type: 'pump', device_name: 'Water Pump' }
              ] as any[];
              
              return displayDevices.map(dev => (
                <div key={dev.id} className="flex items-center justify-between p-4 bg-surface-container rounded-lg border border-outline-variant/10">
                  <div className="flex items-center gap-4">
                    {dev.device_type === 'sensor' ? (
                      <Network size={24} className="text-primary" />
                    ) : (
                      <Router size={24} className="text-primary" />
                    )}
                    <div>
                      <p className="font-label-md font-bold">{dev.device_code}</p>
                      <p className="text-[12px] text-on-surface-variant">
                        {dev.device_type === 'sensor'
                          ? (sensor ? `Temp: ${sensor.temp.toFixed(1)}°C · Soil: ${sensor.soil_moisture}%` : 'Đang kết nối...')
                          : (pump ? (pump.running ? `🟢 Đang chạy — còn ${pump.remaining}s` : '⚪ Idle') : 'Đang kết nối...')}
                      </p>
                    </div>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${
                    dev.device_type === 'sensor'
                      ? (sensor ? 'bg-tertiary-fixed-dim' : 'bg-outline')
                      : (pump ? (pump.running ? 'bg-tertiary-fixed-dim animate-pulse' : 'bg-tertiary-fixed-dim') : 'bg-outline')
                  }`} />
                </div>
              ));
            })()}
            <div className="flex items-center justify-between p-4 bg-error-container/20 rounded-lg border border-error/20">
              <div className="flex items-center gap-4">
                <WifiOff size={24} className="text-error" />
                <div>
                  <p className="font-label-md font-bold text-error">Garden Hub</p>
                  <p className="text-[12px] text-on-error-container/60">Offline — 12m ago</p>
                </div>
              </div>
              <span className="w-3 h-3 bg-error rounded-full pulse-error" />
            </div>
          </div>
          <button className="mt-8 text-primary font-label-md flex items-center gap-2 hover:gap-3 transition-all">
            View Network Topology <ChevronRight size={16} />
          </button>
        </div>

        {/* Historical Trends */}
        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weather history */}
          <div className="glass-card organic-shadow rounded-lg p-6 md:p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h4 className="font-headline-md text-primary">Weather 24h</h4>
                <p className="font-label-md text-on-surface-variant">
                  Nhiệt độ · {tempPoints.length} điểm dữ liệu
                </p>
              </div>
              {!historyLoading && weatherHistory.length > 0 && (
                <span className="text-xs font-label-md text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
                  {weatherHistory[weatherHistory.length - 1]?.temp?.toFixed(1)}°C hiện tại
                </span>
              )}
            </div>
            {historyLoading ? (
              <div className="h-48 bg-surface-variant animate-pulse rounded-lg" />
            ) : (
              <BarChart points={tempPoints} color="var(--md-sys-color-primary, #2d6a4f)" />
            )}
            <div className="flex justify-between mt-4 text-[12px] text-on-surface-variant px-2">
              {tempPoints.length > 0 ? (
                <>
                  <span>{new Date(weatherHistory[0]?.recorded_at ?? '').toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>Bây giờ</span>
                </>
              ) : (
                <span>Chưa có dữ liệu</span>
              )}
            </div>
          </div>

          {/* Soil Moisture history */}
          <div className="glass-card organic-shadow rounded-lg p-6 md:p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h4 className="font-headline-md text-primary">Soil Moisture</h4>
                <p className="font-label-md text-on-surface-variant">
                  Lịch sử · {soilPoints.length} điểm dữ liệu
                </p>
              </div>
              {!historyLoading && soilHistory.length > 0 && (
                <span className="text-xs font-label-md text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
                  {soilHistory[soilHistory.length - 1]?.soil_moisture}% hiện tại
                </span>
              )}
            </div>
            {historyLoading ? (
              <div className="h-48 bg-surface-variant animate-pulse rounded-lg" />
            ) : (
              <LineChart history={soilHistory} field="soil_moisture" color="#94492c" />
            )}
            <div className="flex justify-between mt-4 text-[12px] text-on-surface-variant px-2">
              {soilPoints.length > 0 ? (
                <>
                  <span>{new Date(soilHistory[0]?.recorded_at ?? '').toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>Bây giờ</span>
                </>
              ) : (
                <span>Chưa có dữ liệu</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
