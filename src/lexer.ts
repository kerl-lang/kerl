/*
@ NanoSoft - 22/05/2026
@ The person responsible for the update is Dev Dylan, the creator of the language, who believes in the future of NanoSoft. 
*/

import { Token, TokenType, KEYWORDS } from './types';

export class Lexer {
  private pos: number = 0;
  private line: number = 1;

  constructor(private source: string) {}

  private error(msg: string): never {
    throw new Error(`[Lexer Error] Line ${this.line}: ${msg}`);
  }

  private peek(offset = 0): string {
    return this.source[this.pos + offset] ?? '';
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    if (ch === '\n') this.line++;
    return ch;
  }

  private match(expected: string): boolean {
    if (this.source[this.pos] === expected) { this.pos++; return true; }
    return false;
  }

  private skipWhitespace(): void {
    while (this.pos < this.source.length) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\r' || ch === '\t') {
        this.pos++;
      } else if (ch === '#') {
        while (this.pos < this.source.length && this.peek() !== '\n') this.pos++;
      } else {
        break;
      }
    }
  }

  private readString(quote: string): string {
    let str = '';
    while (this.pos < this.source.length) {
      const ch = this.advance();
      if (ch === quote) return str;
      if (ch === '\\') {
        const esc = this.advance();
        const escapes: Record<string, string> = {
          'n': '\n', 't': '\t', 'r': '\r',
          '\\': '\\', '"': '"', "'": "'",
        };
        str += escapes[esc] ?? esc;
      } else {
        str += ch;
      }
    }
    this.error('Unterminated string');
  }

  private readNumber(): number {
    let num = '';
    while (/[0-9]/.test(this.peek())) num += this.advance();
    if (this.peek() === '.' && /[0-9]/.test(this.peek(1))) {
      num += this.advance();
      while (/[0-9]/.test(this.peek())) num += this.advance();
    }
    return parseFloat(num);
  }

  private readIdent(): string {
    let id = '';
    while (/[a-zA-Z0-9_]/.test(this.peek())) id += this.advance();
    return id;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;

      const line = this.line;
      const ch = this.peek();

      // Newline
      if (ch === '\n') {
        this.advance();
        const last = tokens[tokens.length - 1];
        if (last && last.type !== TokenType.NEWLINE && last.type !== TokenType.LBRACE) {
          tokens.push(new Token(TokenType.NEWLINE, '\n', line));
        }
        continue;
      }

      // Numbers
      if (/[0-9]/.test(ch)) {
        tokens.push(new Token(TokenType.NUMBER, this.readNumber(), line));
        continue;
      }

      // Strings
      if (ch === '"' || ch === "'") {
        this.advance();
        tokens.push(new Token(TokenType.STRING, this.readString(ch), line));
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_]/.test(ch)) {
        const id = this.readIdent();
        const type = KEYWORDS[id] ?? TokenType.IDENT;
        const val = type === TokenType.BOOL
          ? id === 'true'
          : type === TokenType.NULL
          ? null
          : id;
        tokens.push(new Token(type, val as string, line));
        continue;
      }

      // Operators and delimiters
      this.advance();
      switch (ch) {
        case '+': tokens.push(new Token(TokenType.PLUS, ch, line)); break;
        case '-': tokens.push(new Token(TokenType.MINUS, ch, line)); break;
        case '*': tokens.push(new Token(TokenType.STAR, ch, line)); break;
        case '/': tokens.push(new Token(TokenType.SLASH, ch, line)); break;
        case '%': tokens.push(new Token(TokenType.PERCENT, ch, line)); break;
        case '(': tokens.push(new Token(TokenType.LPAREN, ch, line)); break;
        case ')': tokens.push(new Token(TokenType.RPAREN, ch, line)); break;
        case '{': tokens.push(new Token(TokenType.LBRACE, ch, line)); break;
        case '}': tokens.push(new Token(TokenType.RBRACE, ch, line)); break;
        case '[': tokens.push(new Token(TokenType.LBRACKET, ch, line)); break;
        case ']': tokens.push(new Token(TokenType.RBRACKET, ch, line)); break;
        case ',': tokens.push(new Token(TokenType.COMMA, ch, line)); break;
        case '.': tokens.push(new Token(TokenType.DOT, ch, line)); break;
        case ':': tokens.push(new Token(TokenType.COLON, ch, line)); break;
        case '=':
          tokens.push(this.match('=')
            ? new Token(TokenType.EQEQ, '==', line)
            : new Token(TokenType.EQ, '=', line));
          break;
        case '!':
          if (this.match('=')) tokens.push(new Token(TokenType.NEQ, '!=', line));
          else this.error(`Unexpected character: '!'`);
          break;
        case '<':
          tokens.push(this.match('=')
            ? new Token(TokenType.LTE, '<=', line)
            : new Token(TokenType.LT, '<',  line));
          break;
        case '>':
          tokens.push(this.match('=')
            ? new Token(TokenType.GTE, '>=', line)
            : new Token(TokenType.GT, '>',  line));
          break;
        default:
          this.error(`Unexpected character: '${ch}'`);
      }
    }

    tokens.push(new Token(TokenType.EOF, null, this.line));
    return tokens;
  }
}
