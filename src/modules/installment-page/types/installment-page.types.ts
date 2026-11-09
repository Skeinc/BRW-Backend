/** An installment card (Halva, Turtle...). `payment` is empty when the card has no payment day. */
export type InstallmentPageCard = {
  note: string;
  name: string;
  months: number;
  rate: string;
  payment: string;
};

/** A line of a loan card: a grey label and its value. */
export type InstallmentPageLabeledValue = {
  label: string;
  value: string;
};

/** A bank loan or installment offer. */
export type InstallmentPageLoan = {
  bank: string;
  name: string;
  badges: string[];
  term: string;
  rate: string;
  facts: InstallmentPageLabeledValue[];
  details: InstallmentPageLabeledValue[];
  steps: string[];
};

/** Editable blocks of the "Installment" page. */
export type InstallmentPageContent = {
  cards: InstallmentPageCard[];
  loans: InstallmentPageLoan[];
};

/** Response of the page content endpoints; `content` is null until the first save. */
export type InstallmentPageResponse = {
  content: InstallmentPageContent | null;
};
