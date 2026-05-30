import type { ConnectionState } from '../hooks/useSSE';

const labels: Record<ConnectionState, string> = {
  connecting: 'Connecting...',
  sse: 'Live',
  polling: 'Polling',
  disconnected: 'Disconnected',
};

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  return (
    <div className={`connection-status connection-status--${state}`}>
      <span className="connection-dot" />
      <span className="connection-label">{labels[state]}</span>
    </div>
  );
}