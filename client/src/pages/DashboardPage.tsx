import { useSensorData } from '../hooks/useSensorData';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { Thermometer, Droplets, Cloud, Play, WifiOff, Router, Network, Leaf, ChevronRight } from 'lucide-react';

function SkeletonValue({ className = '' }: { className?: string }) {
  return <div className={`bg-surface-variant animate-pulse rounded ${className}`} />;
}

export function DashboardPage() {
  const { sensor, pump, connection } = useSensorData();
  const loading = !sensor;

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
        </div>
      </section>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Live Data Grid (4 sensor cards) */}
        <div className="md:col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
          {/* Temp */}
          <div className="glass-card organic-shadow rounded-lg p-6 flex flex-col justify-between aspect-square">
            <Thermometer size={24} className="text-primary" />
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Temperature</p>
              {loading ? (
                <SkeletonValue className="h-9 w-20" />
              ) : (
                <p className="font-data-display text-data-display">{sensor?.temp ?? '--'}°C</p>
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
                <p className="font-data-display text-data-display">{sensor?.humidity ?? '--'}%</p>
              )}
            </div>
          </div>
          {/* Soil Moisture */}
          <div className={`glass-card organic-shadow rounded-lg p-6 flex flex-col justify-between aspect-square ${
            !loading && (sensor?.soil_moisture ?? 0) < 25
              ? 'border-secondary/30 bg-secondary/5'
              : ''
          }`}>
            <Droplets size={24} className={((sensor?.soil_moisture ?? 0) < 25) ? 'text-secondary' : 'text-primary'} style={{ fill: 'currentColor' }} />
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Soil Moisture</p>
              {loading ? (
                <SkeletonValue className="h-9 w-20" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="font-data-display text-data-display">{sensor?.soil_moisture ?? '--'}%</p>
                  {(sensor?.soil_moisture ?? 0) < 25 && (
                    <span className="bg-secondary text-on-secondary px-2 py-0.5 rounded-full text-[10px] uppercase font-bold">Urgent</span>
                  )}
                </div>
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
                <p className="font-data-display text-data-display">{sensor?.rain ? 'Rain' : 'Dry'}</p>
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
                <span className="text-primary font-bold">15 Minutes</span>
              </div>
              <input type="range" min="5" max="60" defaultValue="15" className="w-full h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" />
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">schedule</span>
                <p className="font-body-md">Next Schedule: <span className="font-bold">4:00 PM</span></p>
              </div>
            </div>
          </div>
          <button className="w-full md:w-48 aspect-square bg-primary text-on-primary rounded-xl flex flex-col items-center justify-center gap-4 transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Play size={36} style={{ fill: 'currentColor' }} />
            <span className="font-label-md text-center px-4">Start Manual Watering</span>
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
            <span className="font-label-md text-primary">AI Health Score: <span className="font-bold">78/100</span></span>
          </div>
          <div className="absolute bottom-6 left-6 text-white">
            <p className="font-label-md opacity-80">Last Updated</p>
            <p className="font-headline-md">2 minutes ago</p>
          </div>
        </div>

        {/* Connected Devices */}
        <div className="md:col-span-12 lg:col-span-5 glass-card organic-shadow rounded-lg p-6 md:p-8 flex flex-col">
          <h3 className="font-headline-md text-headline-md text-primary mb-6">Network Nodes</h3>
          <div className="space-y-4 flex-1">
            {/* Device 1 */}
            <div className="flex items-center justify-between p-4 bg-surface-container rounded-lg border border-outline-variant/10">
              <div className="flex items-center gap-4">
                <Network size={24} className="text-primary" />
                <div>
                  <p className="font-label-md font-bold">Greenhouse Alpha</p>
                  <p className="text-[12px] text-on-surface-variant">Master Controller</p>
                </div>
              </div>
              <span className="w-3 h-3 bg-tertiary-fixed-dim rounded-full"></span>
            </div>
            {/* Device 2 */}
            <div className="flex items-center justify-between p-4 bg-surface-container rounded-lg border border-outline-variant/10">
              <div className="flex items-center gap-4">
                <Router size={24} className="text-primary" />
                <div>
                  <p className="font-label-md font-bold">Patio Sensor 1</p>
                  <p className="text-[12px] text-on-surface-variant">Soil Monitoring</p>
                </div>
              </div>
              <span className="w-3 h-3 bg-tertiary-fixed-dim rounded-full"></span>
            </div>
            {/* Device 3 — Offline */}
            <div className="flex items-center justify-between p-4 bg-error-container/20 rounded-lg border border-error/20">
              <div className="flex items-center gap-4">
                <WifiOff size={24} className="text-error" />
                <div>
                  <p className="font-label-md font-bold text-error">Garden Hub</p>
                  <p className="text-[12px] text-on-error-container/60">Offline — 12m ago</p>
                </div>
              </div>
              <span className="w-3 h-3 bg-error rounded-full pulse-error"></span>
            </div>
          </div>
          <button className="mt-8 text-primary font-label-md flex items-center gap-2 hover:gap-3 transition-all">
            View Network Topology <ChevronRight size={16} />
          </button>
        </div>

        {/* Historical Trends */}
        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weather 24h */}
          <div className="glass-card organic-shadow rounded-lg p-6 md:p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h4 className="font-headline-md text-primary">Weather 24h</h4>
                <p className="font-label-md text-on-surface-variant">Ambient Temperature Dynamics</p>
              </div>
            </div>
            <div className="h-48 flex items-end gap-2 px-2">
              {[60, 45, 30, 55, 75, 65, 40, 35, 50].map((h, i) => (
                <div key={i} className="flex-1 bg-primary/10 rounded-t-full transition-colors hover:bg-primary/20" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[12px] text-on-surface-variant px-2">
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>
            </div>
          </div>

          {/* Soil Moisture 7d */}
          <div className="glass-card organic-shadow rounded-lg p-6 md:p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h4 className="font-headline-md text-primary">Soil Moisture 7d</h4>
                <p className="font-label-md text-on-surface-variant">Greenhouse Zone A Average</p>
              </div>
            </div>
            <div className="h-48 flex items-center justify-center border-b border-l border-outline-variant/30 relative">
              <svg className="w-full h-full px-4" preserveAspectRatio="none" viewBox="0 0 400 100">
                <path d="M0,80 Q50,20 100,50 T200,30 T300,70 T400,90" fill="none" stroke="#94492c" strokeLinecap="round" strokeWidth="3" />
                <circle cx="400" cy="90" fill="#94492c" r="5" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-secondary/5" />
            </div>
            <div className="flex justify-between mt-4 text-[12px] text-on-surface-variant px-2">
              <span>Mon</span><span>Wed</span><span>Fri</span><span>Sun</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
