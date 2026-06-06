import { useSensorData } from '../hooks/useSensorData';
import { useState } from 'react';
import { Droplets, Play, History, TrendingUp, Minus, CheckCircle, AlertTriangle } from 'lucide-react';

export function WateringPage() {
  const { sensor, pump } = useSensorData();
  const [duration, setDuration] = useState(15);

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
                <span className="font-data-display text-data-display text-primary">2.4 <span className="font-body-md">L/min</span></span>
              </div>
            </div>

            {/* Fluid Visual */}
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="relative w-full h-48 bg-surface-container rounded-xl overflow-hidden border border-outline-variant/30">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary-container/20 to-primary/5" />
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-on-tertiary-container/20 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex gap-4 items-end h-full px-12 py-4 w-full">
                    {[60, 85, 40, 70, 90, 55].map((h, i) => (
                      <div key={i} className="flex-1 bg-on-tertiary-container/40 rounded-t-lg" style={{ height: `${h}%` }} />
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
              </div>
              <button className="w-full md:w-auto px-12 py-4 bg-primary text-on-primary rounded-full font-label-md flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/10">
                <Play size={20} style={{ fill: 'currentColor' }} />
                Manual Trigger
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
            <div className="w-12 h-12 rounded-full bg-error-container/30 flex items-center justify-center text-error">
              <AlertTriangle size={24} />
            </div>
          </div>

          {/* Activation History */}
          <div className="glass-card rounded-lg p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-headline-md text-headline-md text-primary">History</h3>
              <button className="text-on-surface-variant hover:text-primary transition-colors">
                <History size={20} />
              </button>
            </div>
            <div className="flex-1 space-y-8 relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-[1px] bg-outline-variant/50" />
              {[
                { label: 'Manual Trigger (User)', time: 'Started 2 mins ago • 15m duration', color: 'bg-primary' },
                { label: 'AI Recommended (Soil < 25%)', time: 'Today 06:45 AM • 12m duration', color: 'bg-secondary' },
                { label: 'Scheduled (Daily Routine)', time: 'Yesterday 08:00 PM • 10m duration', color: 'bg-outline' },
                { label: 'Scheduled (Daily Routine)', time: 'Yesterday 08:00 AM • 10m duration', color: 'bg-outline', faded: true },
              ].map((item, i) => (
                <div key={i} className={`relative pl-10 ${item.faded ? 'opacity-60' : ''}`}>
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-surface-container flex items-center justify-center z-10">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  </div>
                  <p className="font-label-md text-label-md text-primary font-semibold">{item.label}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">{item.time}</p>
                </div>
              ))}
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
              <span className="font-data-display text-data-display text-primary">6.8</span>
              <CheckCircle size={18} className="text-on-tertiary-container mb-2" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-label-md text-label-md text-on-surface-variant">Tank Level</span>
            <div className="flex items-end gap-2">
              <span className="font-data-display text-data-display text-primary">82%</span>
              <div className="w-20 h-2 bg-surface-container rounded-full mb-3 overflow-hidden">
                <div className="bg-primary h-full w-[82%]" />
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
