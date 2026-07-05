import { parseAsnStatement } from "./asnBank";
import { decodeStatementFile } from "./csv";
import { looksLikeGlsStatement, parseGlsStatement } from "./glsBank";
import type { ParsedStatement } from "./types";
import { StatementParseError } from "./types";

export type { ParsedStatement, StatementRow } from "./types";
export { StatementParseError } from "./types";

/**
 * Detect the bank format and parse a statement file's raw bytes.
 * Throws StatementParseError when no known format matches.
 */
export function parseStatementFile(buffer: ArrayBuffer): ParsedStatement {
  const text = decodeStatementFile(buffer);

  // GLS is detected via its header row, ASN via its headerless 19-column
  // shape — the checks cannot both match one file.
  if (looksLikeGlsStatement(text)) {
    return parseGlsStatement(text);
  }
  try {
    return parseAsnStatement(text);
  } catch {
    throw new StatementParseError(
      "Unrecognized file format. Supported: ASN Bank CSV, GLS Bank CSV exports."
    );
  }
}
