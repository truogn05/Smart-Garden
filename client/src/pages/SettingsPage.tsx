import { Wifi, Sliders, Droplets, Thermometer, Waves, Info } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="zen-bg min-h-screen flex-1">
      {/* Canvas Header */}
      <div className="mb-8">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-2">System Preferences</h1>
        <p className="font-body-lg text-body-lg text-outline">Manage your smart garden's connectivity and core parameters.</p>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-16 max-w-6xl w-full">
        {/* Section 1: WiFi */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-surface-variant pb-4">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <Wifi size={20} />
            </div>
            <h2 className="font-headline-md text-headline-md text-primary">Network & Connectivity</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WiFi Provision */}
            <div className="bg-surface/80 backdrop-blur-md rounded-xl p-8 ambient-shadow border border-surface-variant relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none" />
              <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest mb-6">Provision WiFi</h3>
              <form className="flex flex-col gap-6 relative z-10" onSubmit={e => e.preventDefault()}>
                <div className="flex flex-col gap-2">
                  <label className="font-body-md text-body-md text-on-surface-variant" htmlFor="ssid">Network Name (SSID)</label>
                  <input
                    id="ssid"
                    type="text"
                    defaultValue="Botanical_Zen_5G"
                    className="zen-input w-full px-4 py-3 rounded-t-md font-body-md text-body-md text-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-body-md text-body-md text-on-surface-variant" htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    defaultValue="gardenpeace123"
                    className="zen-input w-full px-4 py-3 rounded-t-md font-body-md text-body-md text-on-surface"
                  />
                </div>
                <button type="submit" className="mt-4 px-6 py-3 bg-primary-container text-on-primary-container rounded-full font-label-md text-label-md hover:scale-[1.02] transition-transform self-start shadow-sm">
                  Update Credentials
                </button>
              </form>
            </div>

            {/* Status & Reset */}
            <div className="flex flex-col gap-6">
              {/* Connection Status */}
              <div className="bg-surface-container-low rounded-xl p-6 border border-surface-variant flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase">Current Status</span>
                  <span className="font-body-lg text-body-lg text-primary flex items-center gap-2 mt-1">
                    <span className="w-3 h-3 rounded-full bg-secondary-container inline-block shadow-[0_0_8px_rgba(254,157,122,0.6)]" />
                    Connected
                  </span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase">Signal Strength</span>
                  <span className="font-data-display text-data-display text-primary mt-1">92%</span>
                </div>
              </div>
              {/* Reset */}
              <div className="bg-error-container/20 border border-error-container/50 rounded-xl p-6 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <span className="text-error mt-1 shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </span>
                  <div>
                    <h4 className="font-body-lg text-body-lg text-on-surface font-medium mb-1">Remote Device Reset</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">Triggering a reset will temporarily disconnect your smart garden hub. Only use if sensors are unresponsive.</p>
                  </div>
                </div>
                <button type="button" className="mt-2 px-6 py-3 bg-error text-on-error rounded-full font-label-md text-label-md hover:bg-error/90 transition-colors self-end shadow-sm">
                  Trigger Reset
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: System Config */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-surface-variant pb-4">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <Sliders size={20} />
            </div>
            <h2 className="font-headline-md text-headline-md text-primary">System Configuration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Moisture Threshold */}
            <div className="bg-surface/80 backdrop-blur-md rounded-[24px] p-6 ambient-shadow border border-surface-variant flex flex-col justify-between min-h-[220px]">
              <div className="flex justify-between items-start mb-4">
                <span className="font-label-md text-label-md text-primary uppercase tracking-widest">Moisture Alert</span>
                <Droplets size={20} className="text-outline" />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-2">
                <div className="flex items-end gap-2">
                  <input type="number" defaultValue={25} min={0} max={100} className="zen-input w-20 text-center font-data-display text-data-display text-primary bg-transparent pb-1 px-0" />
                  <span className="font-body-lg text-body-lg text-on-surface-variant pb-2">%</span>
                </div>
                <p className="font-body-md text-body-md text-outline text-sm">Warn when soil moisture drops below this value.</p>
              </div>
            </div>

            {/* Temp Threshold */}
            <div className="bg-surface/80 backdrop-blur-md rounded-[24px] p-6 ambient-shadow border border-surface-variant flex flex-col justify-between min-h-[220px]">
              <div className="flex justify-between items-start mb-4">
                <span className="font-label-md text-label-md text-primary uppercase tracking-widest">High Temp Alert</span>
                <Thermometer size={20} className="text-secondary-container" />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-2">
                <div className="flex items-end gap-2">
                  <input type="number" defaultValue={32} min={-10} max={50} className="zen-input w-20 text-center font-data-display text-data-display text-primary bg-transparent pb-1 px-0" />
                  <span className="font-body-lg text-body-lg text-on-surface-variant pb-2">°C</span>
                </div>
                <p className="font-body-md text-body-md text-outline text-sm">Warn when ambient temperature exceeds this limit.</p>
              </div>
            </div>

            {/* Flow Rate */}
            <div className="bg-surface-container-low rounded-[24px] p-6 border border-surface-variant flex flex-col justify-between min-h-[220px]">
              <div className="flex justify-between items-start mb-4">
                <span className="font-label-md text-label-md text-primary uppercase tracking-widest">Water Flow Rate</span>
                <Waves size={20} className="text-outline" />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-4">
                <div className="flex items-end gap-2">
                  <input type="number" step={0.1} defaultValue={2.5} className="zen-input w-24 text-center font-data-display text-data-display text-primary bg-transparent pb-1 px-0" />
                  <span className="font-body-lg text-body-lg text-on-surface-variant pb-2">L/h</span>
                </div>
                <div className="w-full h-1 bg-surface-variant rounded-full mt-2 relative">
                  <div className="absolute left-0 top-0 h-full bg-primary-container rounded-full w-[45%]" />
                  <div className="absolute left-[45%] top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform" />
                </div>
              </div>
            </div>

            {/* Auto-Adjustment Toggle */}
            <div className="md:col-span-2 lg:col-span-3 bg-tertiary-fixed/30 backdrop-blur-md rounded-xl p-6 border border-tertiary-fixed-dim flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h4 className="font-body-lg text-body-lg text-primary font-medium">Smart Auto-Adjustment</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">Allow Garden Zen to automatically adjust watering based on local weather forecasts.</p>
              </div>
              {/* Toggle */}
              <label className="flex items-center cursor-pointer relative">
                <input type="checkbox" defaultChecked className="sr-only peer zen-toggle" />
                <div className="w-12 h-6 bg-surface-variant rounded-full transition-colors border border-outline-variant" />
                <div className="dot absolute left-1 top-1 bg-surface w-4 h-4 rounded-full transition-all duration-300 border border-outline-variant shadow-sm peer-checked:translate-x-6 peer-checked:border-transparent" />
              </label>
            </div>
          </div>
        </section>

        {/* Sticky Save Banner */}
        <div className="sticky bottom-4 md:bottom-8 z-30 mt-8 w-full max-w-2xl mx-auto">
          <div className="bg-surface/90 backdrop-blur-xl border border-surface-variant rounded-full px-6 py-4 shadow-[0_10px_30px_rgba(23,49,36,0.1)] flex items-center justify-between">
            <span className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
              <Info size={14} />
              Unsaved changes
            </span>
            <div className="flex gap-3">
              <button className="px-5 py-2 text-primary font-label-md text-label-md hover:bg-surface-container rounded-full transition-colors">Discard</button>
              <button className="px-6 py-2 bg-primary text-on-primary rounded-full font-label-md text-label-md hover:scale-[1.02] transition-transform shadow-md">Apply Changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
