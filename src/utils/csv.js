// Build and download a CSV file in the browser.
// Text that starts with = + - @ is prefixed with an apostrophe so a spreadsheet
// can never run it as a formula (CSV injection). Plain numbers are left alone.
function cell(value) {
  let s = value === null || value === undefined ? "" : String(value);
  const isNumber = typeof value === "number" || /^-?\d+(\.\d+)?$/.test(s);
  if (!isNumber && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

export function downloadCsv(filename, headers, rows) {
  // The leading BOM lets Excel read UTF-8 correctly
  const blob = new Blob(["\uFEFF" + toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// -123456 -> "-1234.56" (whole paise only; no floating point)
export function rupeesText(paise) {
  const p = Math.round(paise);
  const sign = p < 0 ? "-" : "";
  const abs = Math.abs(p);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
