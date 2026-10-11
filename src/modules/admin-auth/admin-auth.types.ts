export type AdminTokenPayload = {
  sub: 'admin';
  email: string;
};

export type AdminSession = {
  token: string;
  maxAgeMs: number;
};

export type AdminProfile = {
  email: string;
};
