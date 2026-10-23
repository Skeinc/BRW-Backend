const PHONE_MASK_ONLY = /^[\d\s()+-]+$/;

/** Strips the mask: "+375 (29) 123-45-67" becomes "+375291234567". Text with other characters is returned unchanged. */
export function normalizePhone(value: string): string {
  return PHONE_MASK_ONLY.test(value) ? `+${value.replaceAll(/\D/g, '')}` : value;
}
