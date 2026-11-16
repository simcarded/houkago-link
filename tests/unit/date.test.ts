import { describe, expect, it } from 'vitest';
import { todayInJapan } from '../../src/lib/date';

describe('日本時間の利用日', () => {
  it('UTCでは前日でも日本で日付が変わっていれば当日を返す', () => {
    expect(todayInJapan(new Date('2026-11-16T15:30:00Z'))).toBe('2026-11-17');
  });
});
