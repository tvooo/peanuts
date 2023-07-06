import { format } from "date-fns";

export function formatCurrency(n: number): string {
  const negative = n < 0
  const abs = Math.abs(n)
  
  const cents = abs % 100;
  const euros = Math.floor(abs / 100);

  return `${negative ? '-' : ''}${euros},${cents} €`;
}

export function formatDate(d: Date): string {
  return format(d, 'dd.MM.yyyy')
}
