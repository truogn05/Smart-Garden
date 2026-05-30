import type { DryoutData } from '../hooks/useSSE';

export function DryoutHero({ data }: { data: DryoutData | null }) {
  if (!data) {
    return (
      <div className="dryout-card dryout-card--loading">
        <div className="dryout-icon skeleton-icon" />
        <div className="dryout-body">
          <div className="skeleton-text skeleton-text--lg" />
          <div className="skeleton-text" />
        </div>
      </div>
    );
  }

  const confPct = Math.round(data.confidence * 100);

  return (
    <div className="dryout-card">
      <div className="dryout-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <div className="dryout-body">
        <div className="dryout-headline">
          Soil will be dry in <strong>{data.hours.toFixed(1)} hours</strong>
        </div>
        <div className="dryout-confidence">
          Confidence: {confPct}% <span className="dryout-tag">Learns from your garden</span>
        </div>
      </div>
    </div>
  );
}