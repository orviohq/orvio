const SYMBOLS: Record<string, string> = {
  Space: '␣',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  NumpadDecimal: '.',
  NumpadDivide: '/',
  NumpadMultiply: '×',
  NumpadSubtract: '-',
  NumpadAdd: '+',
  Enter: '↵',
  Backspace: '⌫',
  Tab: '⇥',
};
export function keyLabel(code: string) {
  return SYMBOLS[code] ?? code.replace(/^(Key|Digit|Numpad)/, '');
}
