/**
 * Minimal RFC-4180-style CSV parser: quoted fields, doubled-quote escapes,
 * CR/LF/CRLF line endings, configurable delimiter and quote character (ASN
 * uses single quotes). Bank exports are small enough that a simple character
 * scan is plenty.
 */
export function parseCsv(text: string, delimiter: string, quote: string = '"'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // Skip rows that are entirely empty (trailing newline, blank lines)
    if (row.length > 1 || row[0].trim() !== "") {
      rows.push(row);
    }
    row = [];
  };

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === quote) {
        if (text[i + 1] === quote) {
          field += quote;
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === quote && field === "") {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === delimiter) {
      endField();
      i++;
      continue;
    }
    if (char === "\r") {
      if (text[i + 1] === "\n") i++;
      endRow();
      i++;
      continue;
    }
    if (char === "\n") {
      endRow();
      i++;
      continue;
    }
    field += char;
    i++;
  }

  if (field !== "" || row.length > 0) {
    endRow();
  }

  return rows;
}

/**
 * Decode a statement file. Bank exports are typically UTF-8 or a Windows/ISO
 * Latin encoding; try strict UTF-8 first and fall back to windows-1252
 * (superset of ISO-8859-1) when the bytes aren't valid UTF-8.
 */
export function decodeStatementFile(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}
