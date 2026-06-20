import { useState, useEffect, useRef } from 'react';
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

/** Interpolates coordinates smoothly using cubic Bezier curves */
function getBezierPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const cpX1 = curr.x + (next.x - curr.x) / 2;
    const cpY1 = curr.y;
    const cpX2 = curr.x + (next.x - curr.x) / 2;
    const cpY2 = next.y;
    d += ` C ${cpX1.toFixed(1)} ${cpY1.toFixed(1)}, ${cpX2.toFixed(1)} ${cpY2.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }
  return d;
}

interface InteractiveLineChartProps {
  history: HistoryPoint[];
  field: 'temp' | 'soil_moisture';
  range: '1h' | '24h' | '3d';
  color: string;
  unit: string;
}

function InteractiveLineChart({ history, field, range, color, unit }: InteractiveLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    val: number;
    recorded_at: string;
  } | null>(null);

  const validHistory = history.filter(h => h[field] !== null && h[field] !== undefined);

  if (validHistory.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-on-surface-variant font-label-md">
        Chưa có dữ liệu lịch sử
      </div>
    );
  }

  const endTime = Date.now();
  let startTime = endTime;
  if (range === '1h') startTime = endTime - 60 * 60 * 1000;
  else if (range === '24h') startTime = endTime - 24 * 60 * 60 * 1000;
  else if (range === '3d') startTime = endTime - 3 * 24 * 60 * 60 * 1000;

  let gapThreshold = 8 * 60 * 1000; // 8 mins for 1h
  if (range === '24h') gapThreshold = 3 * 60 * 60 * 1000; // 3 hours
  else if (range === '3d') gapThreshold = 9 * 60 * 60 * 1000; // 9 hours

  const vals = validHistory.map(h => h[field] as number);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const dataSpan = maxVal - minVal;
  let displayMin = minVal;
  let displayMax = maxVal;

  if (field === 'temp') {
    if (dataSpan < 10) {
      const mid = (minVal + maxVal) / 2;
      displayMin = mid - 5;
      displayMax = mid + 5;
    } else {
      displayMin = minVal - dataSpan * 0.1;
      displayMax = maxVal + dataSpan * 0.1;
    }
  } else {
    if (dataSpan < 30) {
      const mid = (minVal + maxVal) / 2;
      displayMin = Math.max(0, mid - 15);
      displayMax = Math.min(100, mid + 15);
    } else {
      displayMin = Math.max(0, minVal - dataSpan * 0.1);
      displayMax = Math.min(100, maxVal + dataSpan * 0.1);
    }
  }

  const yRange = displayMax - displayMin || 1;
  const width = 400;
  const height = 100;
  const paddingY = 10;
  const chartHeight = height - paddingY * 2;

  const coords = validHistory.map(h => {
    const t = new Date(h.recorded_at).getTime();
    const x = ((t - startTime) / (endTime - startTime)) * width;
    const val = h[field] as number;
    const y = height - paddingY - ((val - displayMin) / yRange) * chartHeight;
    return { x, y, t, val, recorded_at: h.recorded_at };
  });

  const boundedCoords = coords.filter(c => c.x >= -5 && c.x <= width + 5);

  const segments: { type: 'solid' | 'dashed'; points: typeof boundedCoords }[] = [];
  let currentSegment: typeof boundedCoords = [];

  for (let i = 0; i < boundedCoords.length; i++) {
    const p = boundedCoords[i];
    if (currentSegment.length === 0) {
      currentSegment.push(p);
    } else {
      const prev = currentSegment[currentSegment.length - 1];
      const timeDiff = p.t - prev.t;
      if (timeDiff > gapThreshold) {
        segments.push({ type: 'solid', points: [...currentSegment] });
        segments.push({ type: 'dashed', points: [prev, p] });
        currentSegment = [p];
      } else {
        currentSegment.push(p);
      }
    }
  }
  if (currentSegment.length > 0) {
    segments.push({ type: 'solid', points: currentSegment });
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const xRatio = clientX / rect.width;
    const targetX = xRatio * width;

    let closestPoint = boundedCoords[0];
    let minDistance = Math.abs(closestPoint.x - targetX);

    for (let i = 1; i < boundedCoords.length; i++) {
      const dist = Math.abs(boundedCoords[i].x - targetX);
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = boundedCoords[i];
      }
    }

    if (minDistance < 40) {
      setHoveredPoint(closestPoint);
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div ref={containerRef} className="h-48 relative border-b border-l border-outline-variant/30">
      <svg
        className="w-full h-full cursor-crosshair overflow-visible"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={`grad-${field}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {segments.map((seg, idx) => {
          if (seg.type !== 'solid' || seg.points.length < 2) return null;
          const p = getBezierPath(seg.points);
          if (!p) return null;
          const first = seg.points[0];
          const last = seg.points[seg.points.length - 1];
          const fillPath = `${p} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;
          return (
            <path
              key={`fill-${idx}`}
              d={fillPath}
              fill={`url(#grad-${field})`}
              className="transition-opacity duration-300"
            />
          );
        })}

        {segments.map((seg, idx) => {
          if (seg.points.length < 2) {
            if (seg.type === 'solid' && seg.points.length === 1) {
              const pt = seg.points[0];
              return (
                <circle
                  key={`dot-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="3"
                  fill={color}
                  opacity="0.8"
                />
              );
            }
            return null;
          }
          const p = getBezierPath(seg.points);
          if (!p) return null;
          return (
            <path
              key={`line-${idx}`}
              d={p}
              fill="none"
              stroke={color}
              strokeLinecap="round"
              strokeWidth="2.5"
              strokeDasharray={seg.type === 'dashed' ? '4 4' : undefined}
              opacity={seg.type === 'dashed' ? 0.4 : 1}
            />
          );
        })}

        {hoveredPoint && (
          <>
            <line
              x1={hoveredPoint.x}
              y1={0}
              x2={hoveredPoint.x}
              y2={height}
              stroke="var(--color-outline-variant)"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity="0.8"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="7"
              fill={color}
              opacity="0.3"
              className="animate-ping"
              style={{ transformOrigin: `${hoveredPoint.x}px ${hoveredPoint.y}px` }}
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="4.5"
              fill="var(--color-surface)"
              stroke={color}
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      {hoveredPoint && (
        <div
          className="absolute z-10 pointer-events-none bg-surface-container-high/95 border border-outline-variant/30 text-on-surface p-2.5 rounded-lg shadow-lg font-label-md text-xs backdrop-blur-md flex flex-col gap-1 transition-all duration-75"
          style={{
            left: `calc(${(hoveredPoint.x / width) * 100}% + ${
              hoveredPoint.x < 50 ? 4 : hoveredPoint.x > width - 50 ? -4 : 0
            }px)`,
            top: `${(hoveredPoint.y / height) * 100 - 8}%`,
            transform: `translate(${
              hoveredPoint.x < 50 ? '0%' : hoveredPoint.x > width - 50 ? '-100%' : '-50%'
            }, -100%)`,
          }}
        >
          <div className="text-on-surface-variant font-bold">
            {new Date(hoveredPoint.recorded_at).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              month: '2-digit',
              day: '2-digit',
            })}
          </div>
          <div className="font-bold flex items-center gap-1.5" style={{ color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            {hoveredPoint.val.toFixed(field === 'temp' ? 1 : 2)}{unit}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { sensor, pump, dryout, connection, lastUpdate, history, historyLoading, devices, range, setRange } = useSensorData();
  const [duration, setDuration] = useState(15);
  const [wateringLoading, setWateringLoading] = useState(false);
  const [wateringError, setWateringError] = useState('');

  // Ticker to force re-render every 10 seconds, updating timeAgo relative labels in real-time
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const loading = !sensor;

  const pumpDevice = devices.find(d => d.device_type === 'pump');
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

  const lastUpdatedLabel = timeAgo(lastUpdate);

  const endTime = Date.now();
  let startTime = endTime;
  if (range === '1h') startTime = endTime - 60 * 60 * 1000;
  else if (range === '24h') startTime = endTime - 24 * 60 * 60 * 1000;
  else if (range === '3d') startTime = endTime - 3 * 24 * 60 * 60 * 1000;

  const startLabel = new Date(startTime).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    ...(range === '3d' ? { month: '2-digit', day: '2-digit' } : {})
  });

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
        <div className="md:col-span-12 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-surface-container/30 p-4 rounded-xl border border-outline-variant/20">
            <div>
              <h3 className="font-headline-md text-primary text-lg font-bold">Lịch sử đo đạc</h3>
              <p className="text-xs text-on-surface-variant">Xem dữ liệu biểu đồ theo các khoảng thời gian khác nhau</p>
            </div>
            <div className="flex bg-surface-container rounded-full p-1 border border-outline-variant/30 self-start sm:self-auto">
              <button
                onClick={() => setRange('1h')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  range === '1h'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                1 Giờ
              </button>
              <button
                onClick={() => setRange('24h')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  range === '24h'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                24 Giờ
              </button>
              <button
                onClick={() => setRange('3d')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  range === '3d'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                3 Ngày
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weather history */}
            <div className="glass-card organic-shadow rounded-lg p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h4 className="font-headline-md text-primary">Nhiệt độ ({range === '1h' ? '1 Giờ' : range === '24h' ? '24 Giờ' : '3 Ngày'})</h4>
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
                <InteractiveLineChart history={weatherHistory} field="temp" range={range} color="var(--md-sys-color-primary, #2d6a4f)" unit="°C" />
              )}
              <div className="flex justify-between mt-4 text-[12px] text-on-surface-variant px-2">
                {!historyLoading && weatherHistory.length > 0 ? (
                  <>
                    <span>{startLabel}</span>
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
                  <h4 className="font-headline-md text-primary">Độ ẩm đất ({range === '1h' ? '1 Giờ' : range === '24h' ? '24 Giờ' : '3 Ngày'})</h4>
                </div>
                {!historyLoading && soilHistory.length > 0 && (
                  <span className="text-xs font-label-md text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
                    {soilHistory[soilHistory.length - 1]?.soil_moisture?.toFixed(2)}% hiện tại
                  </span>
                )}
              </div>
              {historyLoading ? (
                <div className="h-48 bg-surface-variant animate-pulse rounded-lg" />
              ) : (
                <InteractiveLineChart history={soilHistory} field="soil_moisture" range={range} color="#94492c" unit="%" />
              )}
              <div className="flex justify-between mt-4 text-[12px] text-on-surface-variant px-2">
                {!historyLoading && soilHistory.length > 0 ? (
                  <>
                    <span>{startLabel}</span>
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
    </div>
  );
}
