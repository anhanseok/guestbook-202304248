const kst = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** 한국 시간 `YYYY-MM-DD HH:mm` */
export function formatKst(date: Date): string {
  return kst.format(date);
}
