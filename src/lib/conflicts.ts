// Slot-key and overlap logic behind double-booking prevention (AGENTS.md section 7).
// Every booking occupies one slot document per `slotMinutes` it covers. Two bookings for the same court and time
// would need the same slot document, so the second one fails. Times here are minutes since midnight in the center timezone.

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// 570 -> "0930"
export function toHHmm(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}`;
}

// "0930" -> 570
export function fromHHmm(value: string): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(2, 4));
}

// Slot document id: `${courtId}_${date}_${HHmm}`
export function slotKey(courtId: string, date: string, startMinutes: number): string {
  return `${courtId}_${date}_${toHHmm(startMinutes)}`;
}

// Start of every slot a booking covers. 9:00-10:30 with 30-minute slots -> [540, 570, 600].
// The end time itself is not included, so back-to-back bookings never share a slot.
export function slotStarts(startMinutes: number, endMinutes: number, slotMinutes: number): number[] {
  const starts: number[] = [];
  for (let minute = startMinutes; minute < endMinutes; minute += slotMinutes) starts.push(minute);
  return starts;
}

export function overlapsTaken(
  startMinutes: number,
  endMinutes: number,
  slotMinutes: number,
  taken: ReadonlySet<number>,
): boolean {
  return slotStarts(startMinutes, endMinutes, slotMinutes).some((minute) => taken.has(minute));
}

// Joins neighbouring taken slots into ranges for display: [540, 570, 840] -> 9:00-10:00 and 2:00-2:30
export function bookedRanges(taken: ReadonlySet<number>, slotMinutes: number): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  for (const minute of [...taken].sort((a, b) => a - b)) {
    const last = ranges[ranges.length - 1];
    if (last && last.end === minute) last.end = minute + slotMinutes;
    else ranges.push({ start: minute, end: minute + slotMinutes });
  }
  return ranges;
}
