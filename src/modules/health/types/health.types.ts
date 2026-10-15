export type ComponentStatus = 'ok' | 'error';

/** Body of GET /api/health. */
export type HealthResponse = {
  status: ComponentStatus;
  db: ComponentStatus;
  storage: ComponentStatus;
};
