import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { CURRENCY_CODE, CURRENCY_LOCALE } from "@/lib/constants/currency"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency using the app's global currency (see lib/constants/currency.ts).
 */
export function formatCurrency(value: number, currency: string = CURRENCY_CODE, locale: string = CURRENCY_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(value);
}

/**
 * Formats a number with thousand separators
 */
export function formatNumber(value: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value);
}
