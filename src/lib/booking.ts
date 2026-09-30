export type BusyRange = { start_time: string; end_time: string };

function toMinutes(time: string) {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function toTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function buildSlots(options: {
  openTime: string;
  closeTime: string;
  durationMinutes: number;
  intervalMinutes: number;
  bufferMinutes: number;
  busy: BusyRange[];
  /** Minutes since midnight to skip (used for today). */
  minStartMinutes?: number;
}) {
  const {
    openTime,
    closeTime,
    durationMinutes,
    intervalMinutes,
    bufferMinutes,
    busy,
    minStartMinutes = 0,
  } = options;

  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  const step = Math.max(intervalMinutes, 5);
  const busyRanges = busy.map((b) => ({
    start: toMinutes(b.start_time) - bufferMinutes,
    end: toMinutes(b.end_time) + bufferMinutes,
  }));

  const slots: string[] = [];
  for (let start = open; start + durationMinutes <= close; start += step) {
    if (start < minStartMinutes) continue;
    const end = start + durationMinutes;
    const overlaps = busyRanges.some((r) => start < r.end && end > r.start);
    if (!overlaps) slots.push(toTime(start));
  }
  return slots;
}

export function nowMinutesInTimezone(timeZone = "America/Sao_Paulo") {
  const str = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return toMinutes(str);
}

export { toMinutes, toTime };
