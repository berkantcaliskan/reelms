// Reelms — Rich Message System Tokens & Syntax Engine

export interface SemanticColor {
  id: string
  label: string
  color: string // dark theme value
  darkValue: string
}

export const SEMANTIC_COLORS: SemanticColor[] = [
  { id: 'default', label: 'Default', color: '#e5e7eb', darkValue: '#e5e7eb' },
  { id: 'muted', label: 'Muted', color: '#9ca3af', darkValue: '#9ca3af' },
  { id: 'red', label: 'Red', color: '#f87171', darkValue: '#f87171' },
  { id: 'orange', label: 'Orange', color: '#fb923c', darkValue: '#fb923c' },
  { id: 'yellow', label: 'Yellow', color: '#facc15', darkValue: '#facc15' },
  { id: 'green', label: 'Green', color: '#4ade80', darkValue: '#4ade80' },
  { id: 'cyan', label: 'Cyan', color: '#22d3ee', darkValue: '#22d3ee' },
  { id: 'blue', label: 'Blue', color: '#60a5fa', darkValue: '#60a5fa' },
  { id: 'purple', label: 'Purple', color: '#c084fc', darkValue: '#c084fc' },
  { id: 'pink', label: 'Pink', color: '#f472b6', darkValue: '#f472b6' }
];

export const SEMANTIC_COLOR_MAP = new Map<string, string>(
  SEMANTIC_COLORS.map(c => [c.id, c.color])
);

export interface SupportedLanguage {
  id: string
  name: string
  aliases?: string[]
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { id: 'text', name: 'Plain Text', aliases: ['txt', 'plaintext'] },
  { id: 'javascript', name: 'JavaScript', aliases: ['js', 'mjs', 'cjs'] },
  { id: 'typescript', name: 'TypeScript', aliases: ['ts'] },
  { id: 'jsx', name: 'JSX', aliases: ['react'] },
  { id: 'tsx', name: 'TSX' },
  { id: 'html', name: 'HTML', aliases: ['htm', 'xhtml'] },
  { id: 'css', name: 'CSS' },
  { id: 'scss', name: 'SCSS', aliases: ['sass'] },
  { id: 'json', name: 'JSON', aliases: ['jsonc'] },
  { id: 'python', name: 'Python', aliases: ['py'] },
  { id: 'java', name: 'Java' },
  { id: 'c', name: 'C' },
  { id: 'cpp', name: 'C++', aliases: ['cc', 'cxx', 'h', 'hpp'] },
  { id: 'csharp', name: 'C#', aliases: ['cs'] },
  { id: 'go', name: 'Go', aliases: ['golang'] },
  { id: 'rust', name: 'Rust', aliases: ['rs'] },
  { id: 'php', name: 'PHP' },
  { id: 'ruby', name: 'Ruby', aliases: ['rb'] },
  { id: 'swift', name: 'Swift' },
  { id: 'kotlin', name: 'Kotlin', aliases: ['kt', 'kts'] },
  { id: 'sql', name: 'SQL', aliases: ['mysql', 'pgsql', 'postgres'] },
  { id: 'bash', name: 'Bash / Shell', aliases: ['sh', 'shell', 'zsh'] },
  { id: 'powershell', name: 'PowerShell', aliases: ['ps1', 'ps'] },
  { id: 'yaml', name: 'YAML', aliases: ['yml'] },
  { id: 'markdown', name: 'Markdown', aliases: ['md'] }
];

const LANGUAGE_ALIAS_MAP = new Map<string, string>();
SUPPORTED_LANGUAGES.forEach(lang => {
  LANGUAGE_ALIAS_MAP.set(lang.id.toLowerCase(), lang.id);
  LANGUAGE_ALIAS_MAP.set(lang.name.toLowerCase(), lang.id);
  lang.aliases?.forEach(alias => LANGUAGE_ALIAS_MAP.set(alias.toLowerCase(), lang.id));
});

export function normalizeLanguage(lang?: string): string {
  if (!lang) return 'text';
  const clean = lang.trim().toLowerCase();
  return LANGUAGE_ALIAS_MAP.get(clean) || 'text';
}

export function getLanguageName(langId: string): string {
  const norm = normalizeLanguage(langId);
  const found = SUPPORTED_LANGUAGES.find(l => l.id === norm);
  return found ? found.name : 'Plain Text';
}

export function isValidLinkUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return /^https?:\/\//i.test(trimmed);
  }
}

export interface SyntaxToken {
  type: 'keyword' | 'string' | 'comment' | 'number' | 'function' | 'type' | 'operator' | 'punctuation' | 'plain'
  text: string
}

export function tokenizeCode(code: string, langId: string): SyntaxToken[] {
  const norm = normalizeLanguage(langId);
  if (norm === 'text' || !code) {
    return [{ type: 'plain', text: code }];
  }

  const jsKeywords = new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'default', 'try', 'catch', 'finally', 'throw',
    'class', 'extends', 'super', 'new', 'this', 'import', 'export', 'from', 'as', 'async',
    'await', 'yield', 'typeof', 'instanceof', 'in', 'of', 'null', 'undefined', 'true', 'false',
    'interface', 'type', 'enum', 'implements', 'declare', 'abstract', 'readonly', 'private', 'protected', 'public'
  ]);

  const pyKeywords = new Set([
    'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'pass',
    'try', 'except', 'finally', 'raise', 'import', 'from', 'as', 'class', 'with', 'lambda',
    'yield', 'assert', 'async', 'await', 'global', 'nonlocal', 'True', 'False', 'None', 'and', 'or', 'not', 'is', 'in'
  ]);

  const rustKeywords = new Set([
    'fn', 'let', 'mut', 'const', 'static', 'return', 'if', 'else', 'loop', 'while', 'for',
    'in', 'match', 'break', 'continue', 'struct', 'enum', 'trait', 'impl', 'type', 'pub',
    'use', 'mod', 'crate', 'self', 'Self', 'super', 'unsafe', 'where', 'async', 'await',
    'move', 'ref', 'true', 'false', 'Some', 'None', 'Ok', 'Err'
  ]);

  const goKeywords = new Set([
    'func', 'return', 'var', 'const', 'type', 'struct', 'interface', 'package', 'import',
    'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'fallthrough', 'break',
    'continue', 'goto', 'go', 'defer', 'select', 'chan', 'map', 'nil', 'true', 'false'
  ]);

  const sqlKeywords = new Set([
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
    'CREATE', 'TABLE', 'DROP', 'ALTER', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
    'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT',
    'AS', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
  ]);

  const tokens: SyntaxToken[] = [];
  let i = 0;
  const len = code.length;

  while (i < len) {
    const char = code[i];
    const nextChar = code[i + 1] || '';

    // Single-line Comment
    if ((char === '/' && nextChar === '/') || (char === '#' && ['python', 'bash', 'powershell', 'yaml', 'ruby'].includes(norm)) || (char === '-' && nextChar === '-' && norm === 'sql')) {
      let end = code.indexOf('\n', i);
      if (end === -1) end = len;
      tokens.push({ type: 'comment', text: code.slice(i, end) });
      i = end;
      continue;
    }

    // Multi-line Comment
    if (char === '/' && nextChar === '*') {
      const end = code.indexOf('*/', i + 2);
      const tokenEnd = end === -1 ? len : end + 2;
      tokens.push({ type: 'comment', text: code.slice(i, tokenEnd) });
      i = tokenEnd;
      continue;
    }

    // String literals
    if (char === '"' || char === "'" || (char === '`' && ['javascript', 'typescript', 'jsx', 'tsx', 'go', 'sql'].includes(norm))) {
      const quote = char;
      let end = i + 1;
      while (end < len) {
        if (code[end] === '\\') {
          end += 2;
          continue;
        }
        if (code[end] === quote) {
          end++;
          break;
        }
        end++;
      }
      tokens.push({ type: 'string', text: code.slice(i, end) });
      i = end;
      continue;
    }

    // Numbers
    if (/\d/.test(char) && (i === 0 || /[\s\(\[\{,\+\-\*/\%=<>&|!~:;]/.test(code[i - 1]))) {
      let end = i;
      while (end < len && /[0-9a-fA-FxXoObB._]/.test(code[end])) {
        end++;
      }
      tokens.push({ type: 'number', text: code.slice(i, end) });
      i = end;
      continue;
    }

    // Identifiers
    if (/[a-zA-Z_$]/.test(char)) {
      let end = i;
      while (end < len && /[a-zA-Z0-9_$]/.test(code[end])) {
        end++;
      }
      const word = code.slice(i, end);
      const nextNonSpace = code.slice(end).match(/^\s*\(/);

      let isKw = false;
      if (['javascript', 'typescript', 'jsx', 'tsx'].includes(norm) && jsKeywords.has(word)) isKw = true;
      else if (norm === 'python' && pyKeywords.has(word)) isKw = true;
      else if (norm === 'rust' && rustKeywords.has(word)) isKw = true;
      else if (norm === 'go' && goKeywords.has(word)) isKw = true;
      else if (norm === 'sql' && sqlKeywords.has(word.toUpperCase())) isKw = true;
      else if (['c', 'cpp', 'csharp', 'java', 'php', 'kotlin', 'swift'].includes(norm) && jsKeywords.has(word)) isKw = true;

      if (isKw) {
        tokens.push({ type: 'keyword', text: word });
      } else if (nextNonSpace) {
        tokens.push({ type: 'function', text: word });
      } else if (/^[A-Z][a-zA-Z0-9_]*$/.test(word)) {
        tokens.push({ type: 'type', text: word });
      } else {
        tokens.push({ type: 'plain', text: word });
      }
      i = end;
      continue;
    }

    // Operators & Punctuation
    if (/[=+\-\*/%&|^!~<>?:;,.(){}\[\]]/.test(char)) {
      tokens.push({ type: /[(){}\[\];,.]/.test(char) ? 'punctuation' : 'operator', text: char });
      i++;
      continue;
    }

    tokens.push({ type: 'plain', text: char });
    i++;
  }

  return tokens;
}
