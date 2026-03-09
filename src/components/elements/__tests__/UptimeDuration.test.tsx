import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import UptimeDuration from '../UptimeDuration';

describe('UptimeDuration', () => {
  it('renders seconds only for small values', () => {
    render(<UptimeDuration uptime={45} />);
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('renders 0s for zero uptime', () => {
    render(<UptimeDuration uptime={0} />);
    expect(screen.getByText('0s')).toBeInTheDocument();
  });

  it('renders minutes and seconds', () => {
    render(<UptimeDuration uptime={125} />);
    expect(screen.getByText('2m 5s')).toBeInTheDocument();
  });

  it('renders hours, minutes and seconds', () => {
    render(<UptimeDuration uptime={3661} />);
    expect(screen.getByText('1h 1m 1s')).toBeInTheDocument();
  });

  it('renders days for large values', () => {
    render(<UptimeDuration uptime={90061} />);
    expect(screen.getByText('1d 1h 1m 1s')).toBeInTheDocument();
  });

  it('renders within a span element', () => {
    const { container } = render(<UptimeDuration uptime={60} />);
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('1m 0s');
  });

  it('renders exact hour boundary', () => {
    render(<UptimeDuration uptime={3600} />);
    expect(screen.getByText('1h 0m 0s')).toBeInTheDocument();
  });

  it('renders exact day boundary', () => {
    render(<UptimeDuration uptime={86400} />);
    expect(screen.getByText('1d 0h 0m 0s')).toBeInTheDocument();
  });
});
