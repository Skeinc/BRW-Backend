/** A card with a title and a text. */
export type DeliveryPageCard = {
  title: string;
  text: string;
};

/** A payment method card; `enabled: false` hides it on the public page (missing means shown). */
export type DeliveryPagePaymentCard = DeliveryPageCard & {
  enabled?: boolean;
};

/** One question of the FAQ accordion. */
export type DeliveryPageFaqItem = {
  question: string;
  answer: string;
};

/** Editable blocks of the "Delivery and payment" page (Russian). */
export type DeliveryPageContent = {
  payment: DeliveryPagePaymentCard[];
  delivery: DeliveryPageCard[];
  receiving: DeliveryPageCard[];
  documents: string[];
  faq: DeliveryPageFaqItem[];
};

/** Response of the page content endpoints; `content` is null until the first save. */
export type DeliveryPageResponse = {
  content: DeliveryPageContent | null;
};
