export function validReservation(date: string, start: string, end: string, seats: number): boolean {
  const parsed = new Date(`${date}T00:00:00Z`);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date && date >= today && validTime(start) && validTime(end) &&
    start < end && new Date(`${date}T${start}:00+09:00`).getTime() > Date.now() &&
    Number.isInteger(seats) && seats >= 1 && seats <= 4;
}
