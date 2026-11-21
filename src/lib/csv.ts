export function spreadsheetCsvCell(value: string | number | null | undefined, quote = false): string {
  const text = value == null ? "" : String(value);
  // Protect formula prefixes even after spreadsheet whitespace/format normalization.
  const dangerous = typeof value === "string" && (
    /^[\t\r\n]/.test(text) || /^[\s\p{Cc}\p{Cf}]*[=+@-]/u.test(text.normalize("NFKC"))
  );
  const safe = dangerous ? `'${text}` : text;
  return quote || dangerous || /[",;\t\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}
