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

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const CURRENCY = 'BYN';
const FONT_STACK = "Inter,'Helvetica Neue',Helvetica,Arial,sans-serif";
const COLOR_PAGE = '#f7f7f5';
const COLOR_CARD = '#ffffff';
const COLOR_BORDER = '#e8eaed';
const COLOR_INK = '#171a21';
const COLOR_MUTED = '#5b6270';
const COLOR_PRIMARY = '#d92d3e';
const COLOR_PRIMARY_SOFT = '#fde8ea';

const DATE_FORMAT: Intl.DateTimeFormat = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Minsk',
});

export type OrderNotification = {
  subject: string;
  text: string;
  html: string;
};

type DetailRow = {
  label: string;
  value: string;
  /** When set, the value is rendered as a link (`tel:` or `mailto:`). */
  href?: string;
};

type OrderNotificationInput = {
  number: string;
  values: NewOrderValues;
  lines: NewOrderLine[];
  /** Link to the order in the admin panel, used by the button at the bottom of the email. */
  adminUrl: string;
  createdAt: Date;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function formatLineSum({ unitPrice, quantity }: NewOrderLine): string {
  return fromMinorUnits(toMinorUnits(unitPrice) * BigInt(quantity));
}

function buildDeliveryRows({ values }: OrderNotificationInput): DetailRow[] {
  const address: string =
    values.deliveryMethod === 'delivery' ? [values.city, values.address].filter(Boolean).join(', ') : '';
  return [
    { label: 'Получение', value: DELIVERY_LABELS[values.deliveryMethod] },
    ...(address ? [{ label: 'Адрес', value: address }] : []),
    { label: 'Оплата', value: PAYMENT_LABELS[values.paymentMethod] },
  ];
}

function buildCustomerRows({ values }: OrderNotificationInput): DetailRow[] {
  return [
    { label: 'Имя', value: values.contactName },
    { label: 'Телефон', value: values.phone, href: `tel:${values.phone.replace(/[^\d+]/g, '')}` },
    ...(values.email
      ? [{ label: 'Email', value: values.email, href: `mailto:${encodeURIComponent(values.email)}` }]
      : []),
  ];
}

function renderTextBody(input: OrderNotificationInput): string {
  const lineTexts: string[] = input.lines.map((line, index) => {
    const sku: string = line.sku === null ? '' : ` (${line.sku})`;
    return `${index + 1}. ${line.name}${sku}: ${line.quantity} × ${line.unitPrice} = ${formatLineSum(line)}`;
  });
  const details: string[] = [...buildCustomerRows(input), ...buildDeliveryRows(input)].map(
    ({ label, value }) => `${label}: ${value}`,
  );
  return [
    `Поступил новый заказ ${input.number}`,
    '',
    ...details,
    ...(input.values.comment ? [`Комментарий: ${input.values.comment}`] : []),
    '',
    'Товары:',
    ...lineTexts,
    '',
    `Итого: ${input.values.total} ${CURRENCY}`,
    '',
    `Открыть заявку в админ-панели: ${input.adminUrl}`,
  ].join('\n');
}

function renderRow({ label, value, href }: DetailRow): string {
  const text: string = escapeHtml(value).replace(/\n/g, '<br>');
  const content: string = href
    ? `<a href="${escapeHtml(href)}" style="color:${COLOR_PRIMARY};text-decoration:none;">${text}</a>`
    : text;
  return `<tr><td style="padding:8px 0;width:110px;font-size:13px;color:${COLOR_MUTED};vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 0;font-size:14px;font-weight:500;color:${COLOR_INK};vertical-align:top;">${content}</td></tr>`;
}

function renderCardOpen(title: string): string {
  return `<tr><td style="padding:12px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td bgcolor="${COLOR_CARD}" style="background:${COLOR_CARD};border:1px solid ${COLOR_BORDER};border-radius:14px;padding:18px 20px;"><div style="font-size:13px;font-weight:600;color:${COLOR_MUTED};">${escapeHtml(title)}</div>`;
}

const CARD_CLOSE = '</td></tr></table></td></tr>';

function renderInfoCard({ title, rows }: { title: string; rows: DetailRow[] }): string {
  const body: string = rows.map(renderRow).join('');
  return `${renderCardOpen(title)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">${body}</table>${CARD_CLOSE}`;
}

function renderComment(comment: string | null | undefined): string {
  if (!comment) {
    return '';
  }
  const text: string = escapeHtml(comment).replace(/\n/g, '<br>');
  return `${renderCardOpen('Комментарий')}<div style="margin-top:8px;font-size:14px;line-height:21px;color:${COLOR_INK};">${text}</div>${CARD_CLOSE}`;
}

function renderItem(line: NewOrderLine): string {
  const sku: string = line.sku === null ? '' : ` · арт. ${escapeHtml(line.sku)}`;
  const cell = `padding:12px 0;border-top:1px solid ${COLOR_BORDER};vertical-align:top;`;
  return `<tr><td style="${cell}"><div style="font-size:14px;font-weight:500;color:${COLOR_INK};">${escapeHtml(line.name)}</div><div style="margin-top:3px;font-size:12px;color:${COLOR_MUTED};">${line.quantity} × ${escapeHtml(line.unitPrice)} ${CURRENCY}${sku}</div></td><td align="right" style="${cell}padding-left:16px;font-size:14px;font-weight:600;color:${COLOR_INK};white-space:nowrap;">${escapeHtml(formatLineSum(line))} ${CURRENCY}</td></tr>`;
}

function renderItems({ lines, values }: OrderNotificationInput): string {
  const totalCell = `padding:14px 0 0;border-top:1px solid ${COLOR_BORDER};`;
  const total = `<tr><td style="${totalCell}font-size:14px;font-weight:600;color:${COLOR_INK};">Итого</td><td align="right" style="${totalCell}font-size:20px;font-weight:700;color:${COLOR_INK};white-space:nowrap;">${escapeHtml(values.total)} ${CURRENCY}</td></tr>`;
  const rows: string = lines.map(renderItem).join('');
  return `${renderCardOpen(`Товары · ${lines.length}`)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${rows}${total}</table>${CARD_CLOSE}`;
}

function renderHeading({ number, createdAt }: OrderNotificationInput): string {
  const badgeStyle = `display:inline-block;background:${COLOR_PRIMARY_SOFT};color:${COLOR_PRIMARY};font-size:13px;font-weight:600;padding:4px 10px;border-radius:8px;`;
  return `<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td bgcolor="${COLOR_CARD}" style="background:${COLOR_CARD};border:1px solid ${COLOR_BORDER};border-radius:14px;padding:20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:18px;font-weight:800;letter-spacing:3px;color:${COLOR_INK};">BRW</td><td align="right" style="font-size:13px;color:${COLOR_MUTED};">${escapeHtml(DATE_FORMAT.format(createdAt))}</td></tr></table>
<div style="margin-top:16px;font-size:22px;font-weight:700;color:${COLOR_INK};">Поступил новый заказ</div>
<div style="margin-top:10px;"><span style="${badgeStyle}">${escapeHtml(number)}</span></div>
${CARD_CLOSE}`;
}

function renderButton({ adminUrl }: OrderNotificationInput): string {
  const style = `display:block;background:${COLOR_PRIMARY};color:#ffffff;font-size:15px;font-weight:600;text-align:center;text-decoration:none;padding:15px 20px;border-radius:10px;`;
  return `<tr><td style="padding:12px 0 0;"><a href="${escapeHtml(adminUrl)}" style="${style}">Открыть заявку в админ-панели &rarr;</a></td></tr>`;
}

function renderHtmlBody(input: OrderNotificationInput): string {
  const preheader: string = `${input.values.contactName} · ${input.values.phone} · ${input.values.total} ${CURRENCY}`;
  const sections: string = [
    renderHeading(input),
    renderInfoCard({ title: 'Клиент', rows: buildCustomerRows(input) }),
    renderInfoCard({ title: 'Получение и оплата', rows: buildDeliveryRows(input) }),
    renderComment(input.values.comment),
    renderItems(input),
    renderButton(input),
  ].join('\n');
  return `<!DOCTYPE html>
<html lang="ru">
<body style="margin:0;padding:0;background:${COLOR_PAGE};font-family:${FONT_STACK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLOR_PAGE}" style="background:${COLOR_PAGE};padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;">
${sections}
<tr><td align="center" style="padding:20px 0 0;font-size:12px;color:${COLOR_MUTED};">Автоматическое уведомление с сайта BRW</td></tr>
</table></td></tr></table>
</body>
</html>`;
}

/** Subject and bodies (plain text and HTML) of the email that tells a manager about a new order request. */
export function buildOrderNotification(input: OrderNotificationInput): OrderNotification {
  return {
    subject: `Поступил новый заказ: ${input.number}`,
    text: renderTextBody(input),
    html: renderHtmlBody(input),
  };
}
