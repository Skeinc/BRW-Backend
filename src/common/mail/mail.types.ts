/** An email with a plain-text body and an optional HTML version. */
export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Sets Reply-To, so the recipient can answer the customer directly. */
  replyTo?: string;
};
