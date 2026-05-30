import { useEffect, useRef, useState } from 'react';

interface SensorCardProps {
  icon: string;
  label: string;
  value: number | null;
  unit: string;
  threshold?: { warn: number; crit: number };
  loading?: boolean;
}

function getLevel(value: number, threshold?: { warn: number; crit: number }) {
  if (!threshold) return 'normal';
  if (value >= threshold.crit) return 'critical';
  if (value >= threshold.warn) return 'warning';
  return 'normal';
}

export function SensorCard({ icon, label, value, unit, threshold, loading }: SensorCardProps) {
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== null && prevValue.current !== null && value !== prevValue.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
    prevValue.current = value;
  }, [value]);

  if (loading || value === null) {
    return (
      <div className="sensor-card sensor-card--loading">
        <div className="sensor-icon skeleton-icon" />
        <div className="sensor-value skeleton-value" />
        <div className="sensor-label">{label}</div>
      </div>
    );
  }

  const level = getLevel(value, threshold);

  return (
    <div className={`sensor-card sensor-card--${level}${flash ? ' sensor-card--flash' : ''}`}>
      <div className="sensor-icon">{icon}</div>
      <div className="sensor-value">
        {value}<span className="sensor-unit">{unit}</span>
      </div>
      <div className="sensor-label">{label}</div>
    </div>
  );
}