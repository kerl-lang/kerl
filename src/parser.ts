/*
@ The person responsible for the update is Dev Dylan, the creator of the language.
*/

import {
  Token, TokenType, ASTNode,
  ProgramNode, VarDeclNode, AssignNode, FuncDeclNode,
  ReturnNode, IfNode, ElifClause, WhileNode, ForNode,
  BreakNode, ContinueNode, PrintNode, CallNode,
  BinOpNode, UnaryOpNode, IndexNode, MemberNode,
  IdentifierNode, NumberLitNode, StringLitNode,
  BoolLitNode, NullLitNode, ArrayLitNode, DictLitNode,
} from './types';

export class Parser {
  private pos: number = 0;

  constructor(private tokens: Token[]) {}

  private error(msg: string, token?: Token): never {
    const t = token ?? this.peek();
    throw new Error(`[Parser Error] Line ${t.line}: ${msg} (got ${t.type} '${t.value}')`);
  }

  private peek(): Token { return this.tokens[this.pos]; }
  private advance(): Token { return this.tokens[this.pos++]; }
  private check(type: TokenType): boolean { return this.peek().type === type; }

  private match(...types: TokenType[]): boolean {
    for (const t of types) {
      if (this.check(t)) { this.advance(); return true; }
    }
    return false;
  }

  private expect(type: TokenType, msg?: string): Token {
    if (!this.check(type)) this.error(msg ?? `Expected '${type}'`);
    return this.advance();
  }

  private skipNewlines(): void {
    while (this.check(TokenType.NEWLINE)) this.advance();
  }

  // Entry point
  parse(): ProgramNode {
    const body: ASTNode[] = [];
    this.skipNewlines();
    while (!this.check(TokenType.EOF)) {
      body.push(this.parseStatement());
      this.skipNewlines();
    }
    return { type: 'Program', body };
  }

  private parseBlock(): ASTNode[] {
    this.expect(TokenType.LBRACE, "Expected '{'");
    this.skipNewlines();
    const stmts: ASTNode[] = [];
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      stmts.push(this.parseStatement());
      this.skipNewlines();
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return stmts;
  }

  private parseStatement(): ASTNode {
    const t = this.peek();
    switch (t.type) {
      case TokenType.VAR: return this.parseVarDecl();
      case TokenType.FUNC: return this.parseFuncDecl();
      case TokenType.RETURN: return this.parseReturn();
      case TokenType.IF: return this.parseIf();
      case TokenType.WHILE: return this.parseWhile();
      case TokenType.FOR: return this.parseFor();
      case TokenType.PRINT: return this.parsePrint();
      case TokenType.BREAK: this.advance(); return { type: 'Break' } as BreakNode;
      case TokenType.CONTINUE: this.advance(); return { type: 'Continue' } as ContinueNode;
      default: return this.parseExprStatement();
    }
  }

  private parseVarDecl(): VarDeclNode {
    this.expect(TokenType.VAR);
    const name = this.expect(TokenType.IDENT, 'Expected variable name').value as string;
    this.expect(TokenType.EQ, "Expected '='");
    const value = this.parseExpr();
    this.match(TokenType.NEWLINE);
    return { type: 'VarDecl', name, value };
  }

  private parseFuncDecl(): FuncDeclNode {
    this.expect(TokenType.FUNC);
    const name = this.expect(TokenType.IDENT, 'Expected function name').value as string;
    this.expect(TokenType.LPAREN);
    const params: string[] = [];
    if (!this.check(TokenType.RPAREN)) {
      params.push(this.expect(TokenType.IDENT).value as string);
      while (this.match(TokenType.COMMA))
        params.push(this.expect(TokenType.IDENT).value as string);
    }
    this.expect(TokenType.RPAREN);
    const body = this.parseBlock();
    return { type: 'FuncDecl', name, params, body };
  }

  private parseReturn(): ReturnNode {
    this.expect(TokenType.RETURN);
    let value: ASTNode | null = null;
    if (!this.check(TokenType.NEWLINE) && !this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      value = this.parseExpr();
    }
    this.match(TokenType.NEWLINE);
    return { type: 'Return', value };
  }

  private parseIf(): IfNode {
    this.expect(TokenType.IF);
    const cond = this.parseExpr();
    const then = this.parseBlock();
    const elifs: ElifClause[] = [];
    let els: ASTNode[] | null = null;

    this.skipNewlines();
    while (this.check(TokenType.ELIF)) {
      this.advance();
      const elifCond = this.parseExpr();
      const elifBody = this.parseBlock();
      elifs.push({ cond: elifCond, body: elifBody });
      this.skipNewlines();
    }
    if (this.check(TokenType.ELSE)) {
      this.advance();
      els = this.parseBlock();
    }
    return { type: 'If', cond, then, elifs, els };
  }

  private parseWhile(): WhileNode {
    this.expect(TokenType.WHILE);
    const cond = this.parseExpr();
    const body = this.parseBlock();
    return { type: 'While', cond, body };
  }

  private parseFor(): ForNode {
    this.expect(TokenType.FOR);
    const ident = this.expect(TokenType.IDENT).value as string;
    this.expect(TokenType.IN);
    const iter = this.parseExpr();
    const body = this.parseBlock();
    return { type: 'For', ident, iter, body };
  }

  private parsePrint(): PrintNode {
    this.expect(TokenType.PRINT);
    this.expect(TokenType.LPAREN);
    const args: ASTNode[] = [];
    if (!this.check(TokenType.RPAREN)) {
      args.push(this.parseExpr());
      while (this.match(TokenType.COMMA)) args.push(this.parseExpr());
    }
    this.expect(TokenType.RPAREN);
    this.match(TokenType.NEWLINE);
    return { type: 'Print', args };
  }

  private parseExprStatement(): ASTNode {
    const expr = this.parseExpr();
    this.match(TokenType.NEWLINE);
    return expr;
  }

  // Expressions
  private parseExpr(): ASTNode { return this.parseAssign(); }

  private parseAssign(): ASTNode {
    const left = this.parseOr();
    if (this.check(TokenType.EQ)) {
      this.advance();
      return { type: 'Assign', target: left, value: this.parseAssign() } as AssignNode;
    }
    return left;
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.check(TokenType.OR)) {
      const op = this.advance().value as string;
      left = { type: 'BinOp', op, left, right: this.parseAnd() } as BinOpNode;
    }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseEquality();
    while (this.check(TokenType.AND)) {
      const op = this.advance().value as string;
      left = { type: 'BinOp', op, left, right: this.parseEquality() } as BinOpNode;
    }
    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseComparison();
    while (this.check(TokenType.EQEQ) || this.check(TokenType.NEQ)) {
      const op = this.advance().value as string;
      left = { type: 'BinOp', op, left, right: this.parseComparison() } as BinOpNode;
    }
    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseAddSub();
    while ([TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE].includes(this.peek().type)) {
      const op = this.advance().value as string;
      left = { type: 'BinOp', op, left, right: this.parseAddSub() } as BinOpNode;
    }
    return left;
  }

  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv();
    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const op = this.advance().value as string;
      left = { type: 'BinOp', op, left, right: this.parseMulDiv() } as BinOpNode;
    }
    return left;
  }

  private parseMulDiv(): ASTNode {
    let left = this.parseUnary();
    while (this.check(TokenType.STAR) || this.check(TokenType.SLASH) || this.check(TokenType.PERCENT)) {
      const op = this.advance().value as string;
      left = { type: 'BinOp', op, left, right: this.parseUnary() } as BinOpNode;
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.check(TokenType.MINUS)) {
      this.advance();
      return { type: 'UnaryOp', op: '-', operand: this.parseUnary() } as UnaryOpNode;
    }
    if (this.check(TokenType.NOT)) {
      this.advance();
      return { type: 'UnaryOp', op: 'not', operand: this.parseUnary() } as UnaryOpNode;
    }
    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let expr = this.parsePrimary();
    while (true) {
      if (this.check(TokenType.LPAREN)) {
        this.advance();
        const args: ASTNode[] = [];
        if (!this.check(TokenType.RPAREN)) {
          args.push(this.parseExpr());
          while (this.match(TokenType.COMMA)) args.push(this.parseExpr());
        }
        this.expect(TokenType.RPAREN);
        expr = { type: 'Call', callee: expr, args } as CallNode;
      } else if (this.check(TokenType.LBRACKET)) {
        this.advance();
        const index = this.parseExpr();
        this.expect(TokenType.RBRACKET);
        expr = { type: 'Index', obj: expr, index } as IndexNode;
      } else if (this.check(TokenType.DOT)) {
        this.advance();
        const prop = this.expect(TokenType.IDENT).value as string;
        expr = { type: 'Member', obj: expr, prop } as MemberNode;
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): ASTNode {
    const t = this.peek();

    if (t.type === TokenType.NUMBER) { this.advance(); return { type: 'NumberLit', value: t.value as number } as NumberLitNode; }
    if (t.type === TokenType.STRING) { this.advance(); return { type: 'StringLit', value: t.value as string } as StringLitNode; }
    if (t.type === TokenType.BOOL) { this.advance(); return { type: 'BoolLit',   value: t.value as boolean } as BoolLitNode; }
    if (t.type === TokenType.NULL) { this.advance(); return { type: 'NullLit' } as NullLitNode; }
    if (t.type === TokenType.IDENT) { this.advance(); return { type: 'Identifier', name: t.value as string } as IdentifierNode; }

    if (t.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpr();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    if (t.type === TokenType.LBRACKET) {
      this.advance();
      const elements: ASTNode[] = [];
      this.skipNewlines();
      if (!this.check(TokenType.RBRACKET)) {
        elements.push(this.parseExpr());
        while (this.match(TokenType.COMMA)) {
          this.skipNewlines();
          if (this.check(TokenType.RBRACKET)) break;
          elements.push(this.parseExpr());
        }
      }
      this.skipNewlines();
      this.expect(TokenType.RBRACKET);
      return { type: 'ArrayLit', elements } as ArrayLitNode;
    }

    if (t.type === TokenType.LBRACE) {
      this.advance();
      const pairs: [ASTNode, ASTNode][] = [];
      this.skipNewlines();
      if (!this.check(TokenType.RBRACE)) {
        const k = this.parseExpr();
        this.expect(TokenType.COLON);
        const v = this.parseExpr();
        pairs.push([k, v]);
        while (this.match(TokenType.COMMA)) {
          this.skipNewlines();
          if (this.check(TokenType.RBRACE)) break;
          const k2 = this.parseExpr();
          this.expect(TokenType.COLON);
          pairs.push([k2, this.parseExpr()]);
        }
      }
      this.skipNewlines();
      this.expect(TokenType.RBRACE);
      return { type: 'DictLit', pairs } as DictLitNode;
    }

    this.error('Unexpected expression');
  }
}
