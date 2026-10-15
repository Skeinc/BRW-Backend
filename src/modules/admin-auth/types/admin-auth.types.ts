/** Claims stored in the admin JWT. */
export type AdminTokenPayload = {
  sub: string;
  /** Fingerprint of the current credentials; a token stops working when the email or password changes. */
  cv: string;
};

/** Public view of the logged-in admin. */
export type AdminProfile = {
  email: string;
};
