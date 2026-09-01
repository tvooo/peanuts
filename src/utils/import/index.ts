import { parseAsnStatement } from "./asnBank";
import { decodeStatementFile } from "./csv";
import { looksLikeDkbStatement, parseDkbStatement } from "./dkbBank";
import { looksLikeGlsStatement, parseGlsStatement } from "./glsBank";
import type { ParsedStatement } from "./types";
import { StatementParseError } from "./types";

export type { ParsedStatement, StatementRow } from "./types";
export { FORMAT_LABELS, StatementParseError } from "./types";

/**
 * Detect the bank format and parse a statement file's raw bytes.
 * Throws StatementParseError when no known format matches.
 */
export function parseStatementFile(buffer: ArrayBuffer): ParsedStatement {
  const text = decodeStatementFile(buffer);

  // GLS and DKB are detected via their header rows, ASN via its headerless
  // 19-column shape — the checks cannot match the same file.
  if (looksLikeGlsStatement(text)) {
    return parseGlsStatement(text);
  }
  if (looksLikeDkbStatement(text)) {
    return parseDkbStatement(text);
  }
  try {
    return parseAsnStatement(text);
  } catch {
    throw new StatementParseError(
      "Unrecognized file format. Supported: ASN Bank, GLS Bank, and DKB CSV exports."
    );
  }
}
