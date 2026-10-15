const MAX_SLUG_LENGTH = 120;

const CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  і: 'i',
  ў: 'u',
  ґ: 'g',
  є: 'ye',
  ї: 'yi',
};

/**
 * Builds a URL slug from free text: transliterates Cyrillic, lowercases, and joins words with dashes.
 * Returns an empty string when the text has no letters or digits.
 */
export function slugify(text: string, maxLength: number = MAX_SLUG_LENGTH): string {
  const transliterated: string = Array.from(text.toLowerCase())
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join('');
  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}
