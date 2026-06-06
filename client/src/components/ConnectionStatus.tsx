import type { ConnectionState } from '../hooks/useSSE';

const dotStyles: Record<ConnectionState, string> = {
  connecting: 'bg-secondary-container animate-pulse',
  sse: 'bg-tertiary-fixed-dim shadow-[0_0_6px_rgba(170,209,161,0.6)]',
  polling: 'bg-secondary-fixed-dim',
  disconnected: 'bg-error',
};

const labels: Record<ConnectionState, string> = {
  connecting: 'Connecting…',
  sse: 'Live',
  polling: 'Polling',
  disconnected: 'Offline',
};

export function ConnectionStatus({ state, className = '' }: { state: ConnectionState; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${dotStyles[state]}`} />
      <span className="font-label-md text-label-md text-on-surface-variant">{labels[state]}</span>
    </div>
  );
}
