/** A plain-text email. */
export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  /** Sets Reply-To, so the recipient can answer the customer directly. */
  replyTo?: string;
};
