// Simple syntax highlighter for code files
export type TokenType = 'keyword' | 'string' | 'comment' | 'number' | 'function' | 'operator' | 'text' | 'tag' | 'attr' | 'value';

export interface Token {
  type: TokenType;
  content: string;
}

// Create keyword sets for faster lookup
const keywordSets: Record<string, Set<string>> = {};

const KEYWORDS: Record<string, string[]> = {
  javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'super', 'extends', 'implements', 'interface', 'type', 'enum', 'namespace', 'module', 'declare', 'abstract', 'public', 'private', 'protected', 'static', 'readonly', 'true', 'false', 'null', 'undefined', 'instanceof', 'typeof', 'void', 'as', 'is', 'of', 'in', 'do', 'break', 'continue', 'default', 'case', 'switch', 'finally', 'yield', 'get', 'set'],
  python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'pass', 'break', 'continue', 'lambda', 'yield', 'assert', 'raise', 'del', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'self', 'async', 'await', 'global', 'nonlocal', 'elif'],
  bash: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'return', 'export', 'source', 'declare', 'local', 'readonly', 'unset', 'echo', 'printf', 'read', 'cd', 'pwd', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'sed', 'awk', 'cut', 'sort', 'uniq', 'wc'],
  sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'DATABASE', 'INDEX', 'VIEW', 'TRIGGER', 'PROCEDURE', 'FUNCTION', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'NULL', 'IS', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'],
  css: ['color', 'background', 'border', 'margin', 'padding', 'width', 'height', 'display', 'position', 'font', 'text', 'align', 'justify', 'flex', 'grid', 'transform', 'transition', 'animation', 'box', 'shadow', 'opacity', 'z-index', 'size', 'weight', 'family', 'size-adjust'],
  lua: ['function', 'local', 'if', 'then', 'else', 'elseif', 'end', 'do', 'while', 'for', 'repeat', 'until', 'return', 'break', 'and', 'or', 'not', 'true', 'false', 'nil', 'self', 'class', 'require', 'module', 'table', 'string', 'math', 'io', 'os', 'pairs', 'ipairs'],
  json: [],
  yaml: [],
  xml: [],
  html: ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'textarea', 'select', 'option', 'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'nav', 'section', 'article', 'aside', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
};

// Initialize keyword sets
Object.entries(KEYWORDS).forEach(([lang, keywords]) => {
  keywordSets[lang] = new Set(keywords);
});

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'javascript',
    tsx: 'javascript',
    mjs: 'javascript',
    py: 'python',
    sh: 'bash',
    bash: 'bash',
    sql: 'sql',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'css',
    less: 'css',
    cfg: 'bash',
    conf: 'bash',
    ini: 'bash',
    properties: 'bash',
    toml: 'bash',
    env: 'bash',
    lua: 'lua',
  };
  return langMap[ext] || '';
}

export function highlightCode(code: string, language: string): Token[] {

  // Skip highlighting for very large files to prevent UI freezing
  if (code.length > 500000) {
    return [{ type: 'text', content: code }];
  }

  if (!language) {
    return [{ type: 'text', content: code }];
  }

  const lines = code.split('\n');
  const tokens: Token[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTokens = highlightLine(line, language);
    tokens.push(...lineTokens);
    if (i < lines.length - 1) {
      tokens.push({ type: 'text', content: '\n' });
    }
  }

  return tokens;
}

function highlightLine(line: string, language: string): Token[] {
  // Safety limit for line processing to prevent freezing on huge lines
  const MAX_LINE_LENGTH = 50000; // 50KB per line
  if (line.length > MAX_LINE_LENGTH) {
    return [{ type: 'text', content: line }];
  }

  // Use optimized CSS tokenizer to avoid creating tokens for every operator
  if (language === 'css') {
    return highlightLineCSS(line);
  }

  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Block comments (CSS, SQL, XML, HTML, JavaScript)
    if ((language === 'javascript' || language === 'css' || language === 'sql' || language === 'xml' || language === 'html') && line.substring(i, i + 2) === '/*') {
      const endIdx = line.indexOf('*/', i);
      if (endIdx !== -1) {
        tokens.push({ type: 'comment', content: line.substring(i, endIdx + 2) });
        i = endIdx + 2;
        continue;
      } else {
        tokens.push({ type: 'comment', content: line.substring(i) });
        break;
      }
    }

    // Line comments - Lua
    if (language === 'lua' && line.substring(i, i + 2) === '--') {
      const endIdx = line.length;
      tokens.push({ type: 'comment', content: line.substring(i, endIdx) });
      break;
    }

    // Line comments - SQL, CSS, JS
    if ((language === 'javascript' || language === 'json' || language === 'css' || language === 'sql') && line.substring(i, i + 2) === '--') {
      const endIdx = line.length;
      tokens.push({ type: 'comment', content: line.substring(i, endIdx) });
      break;
    }

    if ((language === 'javascript' || language === 'json' || language === 'css') && line.substring(i, i + 2) === '//') {
      const endIdx = line.length;
      tokens.push({ type: 'comment', content: line.substring(i, endIdx) });
      break;
    }

    if ((language === 'python' || language === 'bash' || language === 'yaml') && line[i] === '#') {
      const endIdx = line.length;
      tokens.push({ type: 'comment', content: line.substring(i, endIdx) });
      break;
    }

    if ((language === 'xml' || language === 'html') && line.substring(i, i + 4) === '<!--') {
      const endIdx = line.indexOf('-->', i);
      if (endIdx !== -1) {
        tokens.push({ type: 'comment', content: line.substring(i, endIdx + 3) });
        i = endIdx + 3;
        continue;
      }
    }

    // Strings
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'string', content: line.substring(i, Math.min(j + 1, line.length)) });
      i = Math.min(j + 1, line.length);
      continue;
    }

    // Numbers
    if (/[0-9]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[0-9._]/.test(line[j])) j++;
      tokens.push({ type: 'number', content: line.substring(i, j) });
      i = j;
      continue;
    }

    // HTML/XML tags
    if ((language === 'html' || language === 'xml') && line[i] === '<') {
      const endIdx = line.indexOf('>', i);
      if (endIdx > i) {
        tokens.push({ type: 'tag', content: line.substring(i, endIdx + 1) });
        i = endIdx + 1;
        continue;
      }
    }

    // CSS selectors and properties
    if (language === 'css' && (line[i] === '.' || line[i] === '#')) {
      let j = i + 1;
      while (j < line.length && /[a-zA-Z0-9_-]/.test(line[j])) j++;
      tokens.push({ type: 'tag', content: line.substring(i, j) });
      i = j;
      continue;
    }

    // Keywords and identifiers
    if (/[a-zA-Z_$@]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$-]/.test(line[j])) j++;
      const word = line.substring(i, j);
      const keywordSet = keywordSets[language];
      if (keywordSet && keywordSet.has(word)) {
        tokens.push({ type: 'keyword', content: word });
      } else if (language === 'css' && line[i] === '@') {
        tokens.push({ type: 'keyword', content: word });
      } else {
        tokens.push({ type: 'text', content: word });
      }
      i = j;
      continue;
    }

    // Operators - NOT for CSS (to reduce token count)
    if (language !== 'css' && /[+\-*/%=<>!&|^~?:;]/.test(line[i])) {
      let j = i + 1;
      while (j < line.length && /[+\-*/%=<>!&|^~?:;]/.test(line[j])) j++;
      tokens.push({ type: 'operator', content: line.substring(i, j) });
      i = j;
      continue;
    }

    // Whitespace and other characters
    if (/\s/.test(line[i])) {
      let j = i;
      while (j < line.length && /\s/.test(line[j])) j++;
      tokens.push({ type: 'text', content: line.substring(i, j) });
      i = j;
      continue;
    }

    tokens.push({ type: 'text', content: line[i] });
    i++;
  }

  return tokens.length === 0 ? [{ type: 'text', content: '' }] : tokens;
}

function highlightLineCSS(line: string): Token[] {
  // Optimized CSS line highlighter - groups most content to minimize token count
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Comments
    if (line.substring(i, i + 2) === '/*') {
      const endIdx = line.indexOf('*/', i);
      if (endIdx !== -1) {
        tokens.push({ type: 'comment', content: line.substring(i, endIdx + 2) });
        i = endIdx + 2;
        continue;
      }
    }

    if (line.substring(i, i + 2) === '//' || line.substring(i, i + 2) === '--') {
      tokens.push({ type: 'comment', content: line.substring(i) });
      break;
    }

    // Strings
    if (line[i] === '"' || line[i] === "'") {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'string', content: line.substring(i, Math.min(j + 1, line.length)) });
      i = Math.min(j + 1, line.length);
      continue;
    }

    // Numbers with units (10px, 0.5em, etc)
    if (/[0-9]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[0-9.%]/.test(line[j])) j++;
      // Include unit letters
      while (j < line.length && /[a-zA-Z]/.test(line[j])) j++;
      tokens.push({ type: 'number', content: line.substring(i, j) });
      i = j;
      continue;
    }

    // Property names and selectors (before colon or bracket)
    if (/[a-zA-Z_-]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_-]/.test(line[j])) j++;
      const word = line.substring(i, j);
      
      // Check what follows
      let k = j;
      while (k < line.length && /\s/.test(line[k])) k++;
      
      // Property name (followed by colon)
      if (line[k] === ':') {
        tokens.push({ type: 'attr', content: word });
      } else {
        // Selector or keyword
        tokens.push({ type: 'tag', content: word });
      }
      i = j;
      continue;
    }

    // Hex colors
    if (line[i] === '#' && /[0-9a-fA-F]/.test(line[i + 1])) {
      let j = i + 1;
      while (j < line.length && /[0-9a-fA-F]/.test(line[j])) j++;
      tokens.push({ type: 'string', content: line.substring(i, j) });
      i = j;
      continue;
    }

    // Whitespace - group together
    if (/\s/.test(line[i])) {
      let j = i;
      while (j < line.length && /\s/.test(line[j])) j++;
      tokens.push({ type: 'text', content: line.substring(i, j) });
      i = j;
      continue;
    }

    // Everything else (operators, brackets) - group with following non-whitespace
    let j = i;
    while (j < line.length && !/[a-zA-Z0-9_\-"'\s#]/.test(line[j])) j++;
    if (j === i) j++; // Ensure we advance at least one character
    tokens.push({ type: 'text', content: line.substring(i, j) });
    i = j;
  }

  return tokens.length === 0 ? [{ type: 'text', content: '' }] : tokens;
}
