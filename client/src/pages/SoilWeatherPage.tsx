import { useState, useEffect, useRef } from 'react';
import { useSensorData } from '../hooks/useSensorData';
import { Droplets, Cloud, Gauge, Eye, Sun, Wind } from 'lucide-react';
import { API_BASE } from '../config';

interface InteractiveStabilityChartProps {
  history: any[];
  range: '1h' | '24h' | '3d';
  historyLoading: boolean;
}

function InteractiveStabilityChart({ history, range, historyLoading }: InteractiveStabilityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    yTemp: number | null;
    yMoisture: number | null;
    tempVal: number | null;
    moistureVal: number | null;
    recorded_at: string;
  } | null>(null);

  if (historyLoading) {
    return (
      <div className="absolute inset-0 bg-surface-variant/10 animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-xs text-on-surface-variant font-label-md">Đang tải lịch sử...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs text-on-surface-variant font-label-md">Chưa có dữ liệu lịch sử</span>
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

  const width = 500;
  const height = 200;
  const paddingY = 15;
  const chartHeight = height - paddingY * 2;

  const coords = history.map(h => {
    const t = new Date(h.recorded_at).getTime();
    const x = ((t - startTime) / (endTime - startTime)) * width;
    
    const tempVal = h.temp !== null && h.temp !== undefined ? Number(h.temp) : null;
    const yTemp = tempVal !== null ? height - paddingY - (Math.max(0, Math.min(50, tempVal)) / 50) * chartHeight : null;
    
    const moistureVal = h.soil_moisture !== null && h.soil_moisture !== undefined ? Number(h.soil_moisture) : null;
    const yMoisture = moistureVal !== null ? height - paddingY - (Math.max(0, Math.min(100, moistureVal)) / 100) * chartHeight : null;
    
    return { x, yTemp, yMoisture, tempVal, moistureVal, t, recorded_at: h.recorded_at };
  });

  const boundedCoords = coords.filter(c => c.x >= -5 && c.x <= width + 5);

  // Group temperature points
  const tempCoords = boundedCoords.filter(c => c.yTemp !== null) as (typeof boundedCoords[number] & { yTemp: number; tempVal: number })[];
  const tempSegments: { type: 'solid' | 'dashed'; points: typeof tempCoords }[] = [];
  let currentTempSeg: typeof tempCoords = [];

  for (let i = 0; i < tempCoords.length; i++) {
    const p = tempCoords[i];
    if (currentTempSeg.length === 0) {
      currentTempSeg.push(p);
    } else {
      const prev = currentTempSeg[currentTempSeg.length - 1];
      const timeDiff = p.t - prev.t;
      if (timeDiff > gapThreshold) {
        tempSegments.push({ type: 'solid', points: [...currentTempSeg] });
        tempSegments.push({ type: 'dashed', points: [prev, p] });
        currentTempSeg = [p];
      } else {
        currentTempSeg.push(p);
      }
    }
  }
  if (currentTempSeg.length > 0) {
    tempSegments.push({ type: 'solid', points: currentTempSeg });
  }

  // Group moisture points
  const moistureCoords = boundedCoords.filter(c => c.yMoisture !== null) as (typeof boundedCoords[number] & { yMoisture: number; moistureVal: number })[];
  const moistureSegments: { type: 'solid' | 'dashed'; points: typeof moistureCoords }[] = [];
  let currentMoistureSeg: typeof moistureCoords = [];

  for (let i = 0; i < moistureCoords.length; i++) {
    const p = moistureCoords[i];
    if (currentMoistureSeg.length === 0) {
      currentMoistureSeg.push(p);
    } else {
      const prev = currentMoistureSeg[currentMoistureSeg.length - 1];
      const timeDiff = p.t - prev.t;
      if (timeDiff > gapThreshold) {
        moistureSegments.push({ type: 'solid', points: [...currentMoistureSeg] });
        moistureSegments.push({ type: 'dashed', points: [prev, p] });
        currentMoistureSeg = [p];
      } else {
        currentMoistureSeg.push(p);
      }
    }
  }
  if (currentMoistureSeg.length > 0) {
    moistureSegments.push({ type: 'solid', points: currentMoistureSeg });
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const xRatio = clientX / rect.width;
    const targetX = xRatio * width;

    if (boundedCoords.length === 0) return;

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

  const getBezierPathStability = (pts: { x: number; y: number }[]) => {
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
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        className="w-full h-full cursor-crosshair overflow-visible"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <line x1="0" y1={paddingY} x2={width} y2={paddingY} stroke="var(--color-outline-variant)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.15" />
        <line x1="0" y1={paddingY + chartHeight * 0.25} x2={width} y2={paddingY + chartHeight * 0.25} stroke="var(--color-outline-variant)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.15" />
        <line x1="0" y1={paddingY + chartHeight * 0.5} x2={width} y2={paddingY + chartHeight * 0.5} stroke="var(--color-outline-variant)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.15" />
        <line x1="0" y1={paddingY + chartHeight * 0.75} x2={width} y2={paddingY + chartHeight * 0.75} stroke="var(--color-outline-variant)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.15" />
        <line x1="0" y1={height - paddingY} x2={width} y2={height - paddingY} stroke="var(--color-outline-variant)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.15" />

        {/* Temperature Lines (Solid Green / Dashed Gap) */}
        {tempSegments.map((seg, idx) => {
          if (seg.points.length < 2) {
            if (seg.type === 'solid' && seg.points.length === 1) {
              return (
                <circle
                  key={`t-dot-${idx}`}
                  cx={seg.points[0].x}
                  cy={seg.points[0].yTemp}
                  r="3"
                  fill="var(--color-primary, #2d6a4f)"
                  opacity="0.8"
                />
              );
            }
            return null;
          }
          const pts = seg.points.map(p => ({ x: p.x, y: p.yTemp }));
          const p = getBezierPathStability(pts);
          if (!p) return null;
          return (
            <path
              key={`t-line-${idx}`}
              d={p}
              fill="none"
              stroke="var(--color-primary, #2d6a4f)"
              strokeLinecap="round"
              strokeWidth="2.5"
              strokeDasharray={seg.type === 'dashed' ? '4 4' : undefined}
              opacity={seg.type === 'dashed' ? 0.3 : 1}
            />
          );
        })}

        {/* Moisture Lines (Dashed Brown / Dotted Gap) */}
        {moistureSegments.map((seg, idx) => {
          if (seg.points.length < 2) {
            if (seg.type === 'solid' && seg.points.length === 1) {
              return (
                <circle
                  key={`m-dot-${idx}`}
                  cx={seg.points[0].x}
                  cy={seg.points[0].yMoisture}
                  r="3"
                  fill="var(--color-secondary, #94492c)"
                  opacity="0.8"
                />
              );
            }
            return null;
          }
          const pts = seg.points.map(p => ({ x: p.x, y: p.yMoisture }));
          const p = getBezierPathStability(pts);
          if (!p) return null;
          return (
            <path
              key={`m-line-${idx}`}
              d={p}
              fill="none"
              stroke="var(--color-secondary, #94492c)"
              strokeLinecap="round"
              strokeWidth="2.5"
              strokeDasharray={seg.type === 'dashed' ? '1 6' : '4 4'}
              opacity={seg.type === 'dashed' ? 0.3 : 1}
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
            {hoveredPoint.yTemp !== null && (
              <>
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.yTemp}
                  r="7"
                  fill="var(--color-primary, #2d6a4f)"
                  opacity="0.2"
                  className="animate-ping"
                  style={{ transformOrigin: `${hoveredPoint.x}px ${hoveredPoint.yTemp}px` }}
                />
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.yTemp}
                  r="4.5"
                  fill="var(--color-surface)"
                  stroke="var(--color-primary, #2d6a4f)"
                  strokeWidth="2"
                />
              </>
            )}
            {hoveredPoint.yMoisture !== null && (
              <>
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.yMoisture}
                  r="7"
                  fill="var(--color-secondary, #94492c)"
                  opacity="0.2"
                  className="animate-ping"
                  style={{ transformOrigin: `${hoveredPoint.x}px ${hoveredPoint.yMoisture}px` }}
                />
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.yMoisture}
                  r="4.5"
                  fill="var(--color-surface)"
                  stroke="var(--color-secondary, #94492c)"
                  strokeWidth="2"
                />
              </>
            )}
          </>
        )}
      </svg>

      {hoveredPoint && (
        <div
          className="absolute z-10 pointer-events-none bg-surface-container-high/95 border border-outline-variant/30 text-on-surface p-2.5 rounded-lg shadow-lg font-label-md text-xs backdrop-blur-md flex flex-col gap-1 transition-all duration-75"
          style={{
            left: `calc(${(hoveredPoint.x / width) * 100}% + ${
              hoveredPoint.x < 60 ? 4 : hoveredPoint.x > width - 60 ? -4 : 0
            }px)`,
            top: `${(Math.min(hoveredPoint.yTemp ?? 100, hoveredPoint.yMoisture ?? 100) / height) * 100 - 8}%`,
            transform: `translate(${
              hoveredPoint.x < 60 ? '0%' : hoveredPoint.x > width - 60 ? '-100%' : '-50%'
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
          {hoveredPoint.tempVal !== null && (
            <div className="font-bold flex items-center gap-1.5 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Nhiệt độ: {hoveredPoint.tempVal.toFixed(1)}°C
            </div>
          )}
          {hoveredPoint.moistureVal !== null && (
            <div className="font-bold flex items-center gap-1.5 text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              Độ ẩm đất: {hoveredPoint.moistureVal.toFixed(2)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SoilWeatherPage() {
  const { sensor, history, historyLoading, range, setRange } = useSensorData();

  interface ForecastDay {
    day: string;
    temp: string;
    rain: string;
    type: 'clear' | 'cloudy' | 'rainy';
  }

  const [weatherData, setWeatherData] = useState<{ forecast: ForecastDay[]; alert: string } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchWeather() {
      try {
        const res = await fetch(`${API_BASE}/api/weather/forecast`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch weather');
        const data = await res.json();
        if (!cancelled) {
          setWeatherData(data);
          setWeatherLoading(false);
        }
      } catch (err) {
        console.error('[SoilWeatherPage] Weather fetch error:', err);
        if (!cancelled) {
          setWeatherLoading(false);
        }
      }
    }
    fetchWeather();
    return () => { cancelled = true; };
  }, []);

  const endTime = Date.now();
  const startTime = range === '1h' ? endTime - 3600 * 1000 : range === '24h' ? endTime - 24 * 3600 * 1000 : endTime - 3 * 24 * 3600 * 1000;
  const midTime = (startTime + endTime) / 2;

  const startLabel = new Date(startTime).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    ...(range === '3d' ? { month: '2-digit', day: '2-digit' } : {})
  });

  const midLabel = new Date(midTime).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    ...(range === '3d' ? { month: '2-digit', day: '2-digit' } : {})
  });

  const avgMoisture = (() => {
    const valid = history.filter(h => h.soil_moisture !== null && h.soil_moisture !== undefined);
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, h) => acc + Number(h.soil_moisture), 0);
    return sum / valid.length;
  })();

  const tempFluctuation = (() => {
    const valid = history.filter(h => h.temp !== null && h.temp !== undefined).map(h => Number(h.temp));
    if (valid.length < 2) return 0;
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    return max - min;
  })();

  const avgRain = (() => {
    const valid = history.filter(h => h.rain_intensity !== null && h.rain_intensity !== undefined).map(h => Number(h.rain_intensity));
    if (valid.length === 0) return 'Không mưa';
    const sum = valid.reduce((acc, v) => acc + v, 0);
    const avg = sum / valid.length;
    return avg > 1.5 ? 'Mưa to' : (avg > 0.5 ? 'Mưa nhỏ' : 'Không mưa');
  })();

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-12 pb-24">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-display-lg text-primary mb-2">Soil & Weather</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
            A real-time synthesis of subterranean moisture and atmospheric conditions for your botanical ecosystem.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="bg-surface-container-highest text-on-surface-variant px-4 py-2 rounded-full font-label-md text-label-md">ZONED: 9B</span>
          <span className="bg-tertiary-fixed text-on-tertiary-fixed px-4 py-2 rounded-full font-label-md text-label-md">OPTIMAL GROWTH</span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column */}
        <div className="md:col-span-8 space-y-8">
          {/* Historical Charts */}
          <section className="glass-card p-8 rounded-lg organic-shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">Environmental Stability</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Phân tích tính ổn định môi trường vườn</p>
              </div>
              <div className="flex bg-surface-container rounded-full p-1 border border-outline-variant/30">
                <button
                  onClick={() => setRange('1h')}
                  className={`px-4 py-2 font-label-md text-label-md rounded-full transition-all ${
                    range === '1h'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  1 Giờ
                </button>
                <button
                  onClick={() => setRange('24h')}
                  className={`px-4 py-2 font-label-md text-label-md rounded-full transition-all ${
                    range === '24h'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  24 Giờ
                </button>
                <button
                  onClick={() => setRange('3d')}
                  className={`px-4 py-2 font-label-md text-label-md rounded-full transition-all ${
                    range === '3d'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  3 Ngày
                </button>
              </div>
            </div>

            {/* Chart */}
            <div className="relative h-[250px] w-full border-b border-l border-outline-variant/30 px-2 mt-8">
              <InteractiveStabilityChart history={history} range={range} historyLoading={historyLoading} />
            </div>

            {/* X Axis Labels */}
            <div className="flex justify-between mt-4 text-[11px] text-on-surface-variant px-2">
              {!historyLoading && history.length > 0 ? (
                <>
                  <span>{startLabel}</span>
                  <span>{midLabel}</span>
                  <span>Bây giờ</span>
                </>
              ) : (
                <span>Chưa có dữ liệu</span>
              )}
            </div>

            <div className="mt-12 flex flex-wrap gap-8 border-t border-outline-variant/30 pt-8">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <div>
                  <div className="font-label-md text-label-md text-on-surface-variant">ĐỘ ẨM TRUNG BÌNH</div>
                  <div className="font-bold text-primary">
                    {avgMoisture !== null ? `${avgMoisture.toFixed(2)}%` : '--'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <div>
                  <div className="font-label-md text-label-md text-on-surface-variant">BIẾN ĐỘNG NHIỆT ĐỘ</div>
                  <div className="font-bold text-primary">
                    {tempFluctuation > 0 ? `±${tempFluctuation.toFixed(1)}°C` : '0°C'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-outline" />
                <div>
                  <div className="font-label-md text-label-md text-on-surface-variant">LƯỢNG MƯA LỊCH SỬ</div>
                  <div className="font-bold text-primary">{avgRain}</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <aside className="md:col-span-4 space-y-8">
          {/* 7-Day Forecast */}
          <section className="glass-card p-6 rounded-lg organic-shadow">
            <div className="flex items-center gap-3 mb-8">
              <Cloud size={24} className="text-primary" />
              <h2 className="font-headline-md text-headline-md text-primary">Local Forecast</h2>
            </div>
            <div className="space-y-6">
              {weatherLoading || !weatherData ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="w-16 h-4 bg-surface-variant rounded" />
                    <div className="w-5 h-5 bg-surface-variant rounded-full" />
                    <div className="w-16 h-4 bg-surface-variant rounded" />
                    <div className="w-12 h-4 bg-surface-variant rounded" />
                  </div>
                ))
              ) : (
                weatherData.forecast.map((d, i) => {
                  const Icon = d.type === 'clear' ? Sun : d.type === 'cloudy' ? Cloud : Droplets;
                  const iconColor = d.type === 'clear' ? 'text-secondary' : d.type === 'cloudy' ? 'text-outline' : 'text-primary';
                  const rainPercent = parseInt(d.rain);
                  const rainBold = rainPercent >= 60;
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className={`w-16 font-label-md text-label-md ${i === 0 ? 'text-primary' : 'text-on-surface-variant'}`}>{d.day}</div>
                      <Icon size={20} className={iconColor} />
                      <div className="text-on-surface-variant font-label-md text-label-md">{d.temp}</div>
                      <div className={`w-12 text-right font-label-md text-label-md ${rainBold ? 'text-primary font-bold' : 'text-primary/60'}`}>{d.rain}</div>
                    </div>
                  );
                })
              )}
            </div>
            {!weatherLoading && weatherData && (
              <div className="mt-8 bg-surface-container rounded-lg p-4 flex items-start gap-3">
                <span className="text-secondary shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
                <p className="text-[12px] leading-relaxed text-on-surface-variant">
                  {weatherData.alert}
                </p>
              </div>
            )}
          </section>

          {/* Garden Map */}
          <section className="glass-card overflow-hidden rounded-lg">
            <div className="h-48 relative bg-surface-variant">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMoqhp1tfPQNMzsuc4_6l9F674vekG-kwrWK4MIPB5LI1tgWrGHgXbW3DjZXjSTeoWAYhDDGMfSMKF8GpCqKRBL8TSGvKHNp9z2GuxTMiw_Hd1lXbgKpng6ptEeAN3j7gEmWW9fEIDsGFnkba7NQqHBBUU_2GU82x_ll3RTq6gV4y6_TnXBGqzeOxf3udTxydePWFim1tG7TMmYVUonaIUqHptMks5boREFAIQBkI68XGg3VUeUZBtaKhonyXwtDgAnTaPV8ufN_F8"
                alt="Garden Layout"
                className="w-full h-full object-cover grayscale opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
              <div className="absolute bottom-4 left-4">
                <div className="font-label-md text-label-md text-primary">GARDEN TOPOLOGY</div>
                <div className="font-headline-md text-headline-md text-primary">Northeast Sector</div>
              </div>
            </div>
            <div className="p-6">
              <button className="w-full py-3 rounded-full border border-primary text-primary font-label-md text-label-md hover:bg-primary hover:text-white transition-all">
                View Full Topology
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* Secondary Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Sun, label: 'UV INDEX', value: '4.2', sub: 'Moderate' },
          { icon: Wind, label: 'HUMIDITY', value: `${sensor?.humidity ?? '--'}%`, sub: 'Steady' },
          { icon: Gauge, label: 'PRESSURE', value: '1012', sub: 'hPa' },
          { icon: Eye, label: 'LIGHT', value: '12.5k', sub: 'Lux' },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="glass-card p-6 rounded-lg flex flex-col justify-between h-40">
              <div className="flex justify-between items-start">
                <Icon size={20} className="text-primary" />
                <span className="text-[10px] font-bold text-on-surface-variant">{m.label}</span>
              </div>
              <div>
                <div className="font-data-display text-data-display text-primary">{m.value}</div>
                <div className="font-label-md text-label-md text-on-surface-variant">{m.sub}</div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
