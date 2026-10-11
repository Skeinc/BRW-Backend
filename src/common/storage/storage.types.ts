export type UploadObjectInput = {
  key: string;
  body: Buffer | Uint8Array | string;
  /** Kept for callers and logs; the static server derives Content-Type from the file extension. */
  contentType: string;
};
