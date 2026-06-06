import { useSensorData } from '../hooks/useSensorData';
import { Droplets, Cloud, Leaf, Gauge, Eye, Sun, Wind } from 'lucide-react';

export function SoilWeatherPage() {
  const { sensor } = useSensorData();

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
          {/* Soil Moisture Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Healthy Zone */}
            <div className="glass-card lush-texture p-8 rounded-lg organic-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Leaf size={120} />
              </div>
              <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest mb-6">Zone A: Fern Forest</h3>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-data-display text-data-display text-primary">{sensor?.soil_moisture ?? '--'}%</span>
                <span className="font-label-md text-label-md text-on-primary-container">Optimal</span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full mb-6 overflow-hidden">
                <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(23,49,36,0.3)]" style={{ width: `${sensor?.soil_moisture ?? 50}%` }} />
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">Ideal Range: 60% — 75%</p>
            </div>
            {/* Critical Zone */}
            <div className="glass-card clay-texture p-8 rounded-lg organic-shadow border-secondary/30 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-secondary text-on-secondary px-3 py-1 rounded-full text-[10px] font-bold">CRITICAL</span>
              </div>
              <h3 className="font-label-md text-label-md text-secondary uppercase tracking-widest mb-6">Zone B: Cactus Rockery</h3>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-data-display text-data-display text-secondary">12%</span>
                <span className="font-label-md text-label-md text-on-secondary-container">Arid</span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full mb-6 overflow-hidden">
                <div className="h-full bg-secondary w-[12%] rounded-full shadow-[0_0_10px_rgba(148,73,44,0.4)]" />
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">Ideal Range: 25% — 40%</p>
            </div>
          </section>

          {/* Historical Charts */}
          <section className="glass-card p-8 rounded-lg organic-shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">Environmental Stability</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Last 30 days composite analysis</p>
              </div>
              <div className="flex bg-surface-container rounded-full p-1">
                {['24h', '7d', '30d'].map((label, i) => (
                  <button
                    key={label}
                    className={`px-4 py-2 font-label-md text-label-md transition-colors ${
                      i === 2 ? 'bg-white text-primary rounded-full shadow-sm' : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Chart */}
            <div className="relative h-[320px] w-full flex items-end justify-between gap-1">
              <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M0,80 Q25,20 50,60 T100,30" fill="none" stroke="#173124" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <path d="M0,60 Q25,80 50,30 T100,70" fill="none" stroke="#94492c" strokeDasharray="4 4" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              {['OCT 01', 'OCT 05', 'OCT 10', 'OCT 15', 'OCT 20', 'OCT 25', 'OCT 30'].map((label, i) => {
                const heights = [24, 30, 12, 40, 20, 48, 24];
                return (
                  <div key={i} className="flex flex-col items-center gap-2 group w-full">
                    <div className="w-full bg-primary/10 rounded-t-sm group-hover:bg-primary/30 transition-colors relative" style={{ height: `${heights[i] + 20}px` }}>
                      <div className="absolute bottom-0 left-0 right-0 bg-primary/60 rounded-t-sm" style={{ height: `${heights[i]}px` }} />
                    </div>
                    <span className="text-[10px] text-on-surface-variant font-medium whitespace-nowrap">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-12 flex flex-wrap gap-8 border-t border-outline-variant/30 pt-8">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <div>
                  <div className="font-label-md text-label-md text-on-surface-variant">AVG MOISTURE</div>
                  <div className="font-bold text-primary">{sensor?.soil_moisture ?? '--'}%</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <div>
                  <div className="font-label-md text-label-md text-on-surface-variant">TEMP FLUCTUATION</div>
                  <div className="font-bold text-primary">±4.2°C</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-outline" />
                <div>
                  <div className="font-label-md text-label-md text-on-surface-variant">RAIN INTENSITY</div>
                  <div className="font-bold text-primary">Low</div>
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
              {[
                { day: 'TODAY', icon: Sun, temp: '24° / 16°', rain: '0%', iconColor: 'text-secondary' },
                { day: 'MON', icon: Cloud, temp: '22° / 15°', rain: '15%', iconColor: 'text-outline' },
                { day: 'TUE', icon: Droplets, temp: '19° / 12°', rain: '85%', iconColor: 'text-primary', rainBold: true },
                { day: 'WED', icon: Cloud, temp: '18° / 11°', rain: '90%', iconColor: 'text-primary', rainBold: true },
                { day: 'THU', icon: Cloud, temp: '20° / 14°', rain: '30%', iconColor: 'text-outline' },
              ].map((d, i) => {
                const Icon = d.icon;
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className={`w-16 font-label-md text-label-md ${i === 0 ? 'text-primary' : 'text-on-surface-variant'}`}>{d.day}</div>
                    <Icon size={20} className={d.iconColor} />
                    <div className="text-on-surface-variant font-label-md text-label-md">{d.temp}</div>
                    <div className={`w-12 text-right font-label-md text-label-md ${d.rainBold ? 'text-primary font-bold' : 'text-primary/60'}`}>{d.rain}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 bg-surface-container rounded-lg p-4 flex items-start gap-3">
              <span className="text-secondary shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </span>
              <p className="text-[12px] leading-relaxed text-on-surface-variant">
                Heavy rain expected Tuesday. Automatic irrigation will be suspended for 48 hours to prevent root rot.
              </p>
            </div>
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
