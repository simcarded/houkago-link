import { afterEach, describe, expect, it, vi } from 'vitest';
import { validReservation } from '../../functions/_lib/reservation';

describe('reservation time in Japan', () => {
  afterEach(() => vi.useRealTimers());

  it('rejects past and current start times but accepts future times', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T08:30:00+09:00'));
    expect(validReservation('2026-11-17', '08:29', '09:30', 1)).toBe(false);
    expect(validReservation('2026-11-17', '08:30', '09:30', 1)).toBe(false);
    expect(validReservation('2026-11-17', '08:31', '09:30', 1)).toBe(true);
    expect(validReservation('2026-11-18', '08:00', '09:00', 1)).toBe(true);
  });
});
