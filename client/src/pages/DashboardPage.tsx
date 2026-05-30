import { useSensorData } from '../hooks/useSensorData';
import { SensorCard } from '../components/SensorCard';
import { DryoutHero } from '../components/DryoutHero';
import { PumpButton } from '../components/PumpButton';
import { ResetButton } from '../components/ResetButton';
import { ConnectionStatus } from '../components/ConnectionStatus';

export function DashboardPage() {
  const { sensor, dryout, pump, connection } = useSensorData();
  const loading = !sensor;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-logo">
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="#1a5c2a"/>
            <path d="M24 10c-7.7 0-14 6.3-14 14 0 5.2 2.9 9.8 7 12.2V40c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-3.8c4.1-2.4 7-7 7-12.2 0-7.7-6.3-14-14-14zm-4 36v-2h8v2h-8zm10-6H18v-4h22v4z" fill="#4ade80"/>
          </svg>
          <span>SmartGarden</span>
        </div>
        <ConnectionStatus state={connection} />
      </header>

      <main className="dashboard-main">
        <section className="sensor-grid">
          <SensorCard
            icon="🌡"
            label="Temperature"
            value={sensor?.temp ?? null}
            unit="°C"
            loading={loading}
          />
          <SensorCard
            icon="💧"
            label="Humidity"
            value={sensor?.humidity ?? null}
            unit="%"
            loading={loading}
          />
          <SensorCard
            icon="🌱"
            label="Soil Moisture"
            value={sensor?.soil_moisture ?? null}
            unit="%"
            threshold={{ warn: 35, crit: 20 }}
            loading={loading}
          />
          <SensorCard
            icon="🌧"
            label="Rain"
            value={sensor?.rain ?? null}
            unit=""
            loading={loading}
          />
        </section>

        <section className="dryout-section">
          <DryoutHero data={dryout} />
        </section>

        <section className="controls-grid">
          <PumpButton pumpStatus={pump} />
          <ResetButton />
        </section>
      </main>
    </div>
  );
}