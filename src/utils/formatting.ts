import { format } from "date-fns";
import { padStart } from "lodash";

export function formatCurrency(n: number): string {
  const negative = n < 0
  const abs = Math.abs(n)
  
  const cents = abs % 100;
  const euros = Math.floor(abs / 100);
  
  return `${negative ? '-' : ''}${euros},${padStart(String(cents), 2, '0')} €`;
}

export function formatDate(d: Date): string {
  return format(d, 'dd.MM.yyyy')
}

export function formatDateIsoShort(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function formatMonth(d: Date): string {
  return format(d, "MMM yyyy");
}
