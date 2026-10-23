import { fromMinorUnits } from '../../../common/lib/from-minor-units.js';
import { toMinorUnits } from '../../../common/lib/to-minor-units.js';
import type { NewOrderLine, NewOrderValues } from '../types/orders.types.js';

const DELIVERY_LABELS: Readonly<Record<NonNullable<NewOrderValues['deliveryMethod']>, string>> = {
  delivery: 'Доставка',
  pickup: 'Самовывоз',
};

const PAYMENT_LABELS: Readonly<Record<NonNullable<NewOrderValues['paymentMethod']>, string>> = {
  cash_on_delivery: 'Наличными при получении',
  installment: 'Рассрочка',
  bank_transfer: 'Банковский перевод',
};

export type OrderNotification = {
  subject: string;
  text: string;
};

/** Subject and plain-text body of the email that tells a manager about a new order request. */
export function buildOrderNotification({
  number,
  values,
  lines,
}: {
  number: string;
  values: NewOrderValues;
  lines: NewOrderLine[];
}): OrderNotification {
  const lineTexts: string[] = lines.map((line, index) => {
    const sum: string = fromMinorUnits(toMinorUnits(line.unitPrice) * BigInt(line.quantity));
    const sku: string = line.sku === null ? '' : ` (${line.sku})`;
    return `${index + 1}. ${line.name}${sku}: ${line.quantity} × ${line.unitPrice} = ${sum}`;
  });
  const delivery: string =
    values.deliveryMethod === 'delivery'
      ? `${DELIVERY_LABELS.delivery}: ${[values.city, values.address].filter(Boolean).join(', ')}`
      : DELIVERY_LABELS.pickup;
  const details: string[] = [
    `Заявка ${number}`,
    '',
    `Имя: ${values.contactName}`,
    `Телефон: ${values.phone}`,
    ...(values.email ? [`Email: ${values.email}`] : []),
    delivery,
    `Оплата: ${PAYMENT_LABELS[values.paymentMethod]}`,
    ...(values.comment ? [`Комментарий: ${values.comment}`] : []),
    '',
    'Товары:',
    ...lineTexts,
    '',
    `Итого: ${values.total}`,
  ];
  return { subject: `Новая заявка ${number}`, text: details.join('\n') };
}
