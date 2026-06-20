import { useState, useEffect } from 'react';
import { useSensorData } from '../hooks/useSensorData';
import { Droplets, Cloud, Leaf, Gauge, Eye, Sun, Wind } from 'lucide-react';
import { API_BASE } from '../config';

function buildAbsolutePath(points: (number | null)[], maxVal: number, width = 500, height = 200): string {
  const valid = points.map((v, i) => ({ v, i })).filter(p => p.v !== null && p.v !== undefined);
  if (valid.length < 2) return '';
  const step = width / (points.length - 1 || 1);
  return valid
    .map((p) => {
      const x = p.i * step;
      const y = height - (Math.max(0, Math.min(maxVal, Number(p.v))) / maxVal) * height;
      return `${p.i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
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

  const tempPoints = history.map(h => h.temp);
  const moisturePoints = history.map(h => h.soil_moisture);

  const tempPath = buildAbsolutePath(tempPoints, 50, 500, 200);
  const moisturePath = buildAbsolutePath(moisturePoints, 100, 500, 200);

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
              {historyLoading ? (
                <div className="absolute inset-0 bg-surface-variant/10 animate-pulse rounded-lg flex items-center justify-center">
                  <span className="text-xs text-on-surface-variant font-label-md">Đang tải lịch sử...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-on-surface-variant font-label-md">Chưa có dữ liệu lịch sử</span>
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <line x1="0" y1="50" x2="500" y2="50" stroke="var(--color-outline-variant)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="var(--color-outline-variant)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                    <line x1="0" y1="150" x2="500" y2="150" stroke="var(--color-outline-variant)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                    
                    {tempPath && (
                      <path d={tempPath} fill="none" stroke="var(--color-primary, #2d6a4f)" strokeWidth="2.5" strokeLinecap="round" />
                    )}

                    {moisturePath && (
                      <path d={moisturePath} fill="none" stroke="var(--color-secondary, #94492c)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" />
                    )}
                  </svg>
                </div>
              )}
            </div>

            {/* X Axis Labels */}
            <div className="flex justify-between mt-4 text-[11px] text-on-surface-variant px-2">
              {!historyLoading && history.length > 0 ? (
                <>
                  <span>
                    {new Date(history[0].recorded_at).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      ...(range === '3d' ? { month: '2-digit', day: '2-digit' } : {})
                    })}
                  </span>
                  <span>
                    {new Date(history[Math.floor(history.length / 2)].recorded_at).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      ...(range === '3d' ? { month: '2-digit', day: '2-digit' } : {})
                    })}
                  </span>
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
          {/* 5-Day Forecast */}
          <section className="glass-card p-6 rounded-lg organic-shadow">
            <div className="flex items-center gap-3 mb-8">
              <Cloud size={24} className="text-primary" />
              <h2 className="font-headline-md text-headline-md text-primary">Local Forecast</h2>
            </div>
            <div className="space-y-6">
              {weatherLoading || !weatherData ? (
                Array.from({ length: 5 }).map((_, i) => (
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
