export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "?";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const precision = index <= 1 ? 0 : value < 10 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[index]}`;
}

export function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "");
}

