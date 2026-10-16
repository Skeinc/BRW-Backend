const LIKE_SPECIAL_CHARACTERS: RegExp = /[\\%_]/g;

/** `LIKE` pattern that matches `text` anywhere in a value; `%`, `_` and `\` in the text match themselves. */
export function buildContainsPattern(text: string): string {
  return `%${text.replace(LIKE_SPECIAL_CHARACTERS, '\\$&')}%`;
}
