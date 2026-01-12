import { format, isValid, parse } from "date-fns";

/**
 * Formats a Date object to German date format (dd.MM.yyyy)
 * @param date The date to format
 * @returns Formatted date string (e.g., "25.12.2024")
 */
export function formatGermanDate(date: Date): string {
  return format(date, "dd.MM.yyyy");
}

/**
 * Parses a German date string (dd.MM.yyyy) to a Date object
 * @param input The date string to parse (e.g., "25.12.2024")
 * @returns Parsed Date object or null if invalid
 */
export function parseGermanDate(input: string): Date | null {
  // Use date-fns parse with German format
  const parsed = parse(input, "dd.MM.yyyy", new Date());

  // Validate the date is valid
  if (!isValid(parsed)) {
    return null;
  }

  return parsed;
}
