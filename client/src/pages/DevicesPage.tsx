import { Droplets, Cpu, Wifi, CloudSync } from 'lucide-react';
import { useSensorData } from '../hooks/useSensorData';

export function DevicesPage() {
  const { devices, devicesLoading } = useSensorData();

  const sensorDevice = devices.find(d => d.device_type === 'sensor');
  const systemUptime = sensorDevice?.uptime !== null && sensorDevice?.uptime !== undefined 
    ? `${sensorDevice.uptime}s` 
    : 'N/A';

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-8 pb-24">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Device Management</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Monitor and manage your IoT garden nodes.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-primary hover:scale-105 transition-transform">
            <Wifi size={20} />
          </button>
          <button className="text-primary hover:scale-105 transition-transform">
            <CloudSync size={20} />
          </button>
          <div className="w-10 h-10 rounded-full bg-surface-variant overflow-hidden border border-outline-variant">
            <img
              alt="Profile"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMHowUrb09p6MA3C8AOejxff8GLGHs7DoB0_kghYCSh1mHFRRBmgbZy_XOPyzumLZCqiOwbjFLw4aYn63J_RK59SvHTHRYBB9fkPBrmk3Fs55M7wnzZQk-Pe48WU7nAKFUmtFwwc7qLHb48_SU0V5gjMMFoTFbU3y_NOMetXLv7outUv1CurwGwSz_vFjJWWz9QG9a3O4fcpkOEKaOHfuEhhtWxM_9-GBSUVmjl7v4CHKsPpwtAy5CkEqNyc8ZMehSBwd7KIxpVPGO"
            />
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Nodes */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <h3 className="font-headline-md text-headline-md text-primary">Active Nodes</h3>
          <div className="flex flex-col gap-4">
            {devicesLoading ? (
              <div className="glass-panel rounded-xl p-8 text-center text-on-surface-variant">
                Loading nodes...
              </div>
            ) : devices.length === 0 ? (
              <div className="glass-panel rounded-xl p-8 text-center text-on-surface-variant">
                No active nodes found.
              </div>
            ) : (
              devices.map((device) => {
                const isSensor = device.device_type === 'sensor';
                const isOnline = device.is_active;
                const ipStr = device.ip_address || 'Not available';
                const signalStr = device.rssi !== null && device.rssi !== undefined ? `${device.rssi}dBm` : 'N/A';
                const uptimeStr = device.uptime !== null && device.uptime !== undefined ? `${device.uptime}s` : 'N/A';

                return (
                  <div
                    key={device.device_code}
                    className="glass-panel rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-[0_40px_80px_rgba(23,49,36,0.05)] transition-shadow duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary">
                        {isSensor ? <Cpu size={24} /> : <Droplets size={24} />}
                      </div>
                      <div>
                        <h4 className="font-label-md text-label-md text-on-surface">
                          {device.device_name || (isSensor ? 'Garden Sensor' : 'Water Pump')} ({device.device_code})
                        </h4>
                        <p className="font-body-md text-sm text-on-surface-variant mt-1">{ipStr}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex flex-col items-end min-w-[70px]">
                        <span className="font-body-md text-sm text-outline">Signal</span>
                        <span className="font-label-md text-label-md text-primary">{signalStr}</span>
                      </div>
                      <div className="flex flex-col items-end min-w-[70px]">
                        <span className="font-body-md text-sm text-outline">Uptime</span>
                        <span className="font-label-md text-label-md text-primary">{uptimeStr}</span>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                        isOnline 
                          ? 'bg-primary-container/20 text-primary-container' 
                          : 'bg-outline-variant/20 text-outline'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary-container animate-pulse' : 'bg-outline'}`} />
                        <span className="font-label-md text-xs">{isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* System Health */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <h3 className="font-headline-md text-headline-md text-primary">System Health</h3>
          <div className="glass-panel rounded-2xl p-8 flex flex-col gap-8 relative overflow-hidden h-full">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-fixed-dim/20 rounded-full blur-3xl pointer-events-none" />
            <div className="grid grid-cols-2 gap-8 z-10">
              <div>
                <p className="font-body-md text-sm text-on-surface-variant mb-2">Firmware</p>
                <p className="font-data-display text-data-display text-primary">v1.0.2</p>
              </div>
              <div>
                <p className="font-body-md text-sm text-on-surface-variant mb-2">Uptime</p>
                <p className="font-data-display text-data-display text-primary">{systemUptime}</p>
              </div>
            </div>
            <div className="h-px w-full bg-surface-variant my-2 z-10" />
            <div className="flex items-center justify-between z-10">
              <div>
                <p className="font-label-md text-label-md text-on-surface mb-1">MQTT Connection</p>
                <p className="font-body-md text-sm text-on-surface-variant">HiveMQ Cloud</p>
              </div>
              <div className="w-12 h-12 rounded-full border border-primary-container/30 flex items-center justify-center bg-surface-bright shadow-sm">
                <CloudSync size={24} className="text-primary-container" style={{ fill: 'currentColor' }} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
