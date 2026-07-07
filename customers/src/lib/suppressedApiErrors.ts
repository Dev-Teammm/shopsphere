const SUPPRESSED_API_ERROR_MESSAGES = [
  "access denied",
  "wishlist is empty",
  "cart is empty",
] as const;

export function isSuppressedApiError(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return SUPPRESSED_API_ERROR_MESSAGES.some(
    (suppressed) =>
      normalized === suppressed || normalized.includes(suppressed),
  );
}
