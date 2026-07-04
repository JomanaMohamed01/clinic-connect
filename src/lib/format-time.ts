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
