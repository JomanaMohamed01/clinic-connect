/** 12-hour clock with AM/PM. */
export function formatTime12h(date: Date): string {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const period = hours24 >= 12 ? "PM" : "AM";
  let hour12 = hours24 % 12;
  if (hour12 === 0) hour12 = 12;
  const mm = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${hour12}:${mm} ${period}`;
}

/** Turn a stored "HH:mm" slot into a 12-hour label such as "1:30 PM". */
export function formatSlotLabel(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const slot = new Date();
  slot.setHours(hours, minutes, 0, 0);
  return formatTime12h(slot);
}

const VISIT_MINUTES = 30;

/** A visit is past once its 30-minute slot has ended. */
export function isPastVisit(dateKey: string, time: string, now = new Date()): boolean {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const start = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return start.getTime() + VISIT_MINUTES * 60 * 1000 <= now.getTime();
}
