/*
@ The person responsible for the update is Dev Dylan, the creator of the language.
*/

// Token Types
export enum TokenType {
  // Literal
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOL = 'BOOL',
  NULL = 'NULL',

  // Identifiers
  IDENT = 'IDENT',

  // Keywords
  VAR = 'VAR',
  FUNC = 'FUNC',
  RETURN = 'RETURN',
  IF = 'IF',
  ELIF = 'ELIF',
  ELSE = 'ELSE',
  FOR = 'FOR',
  WHILE = 'WHILE',
  IN = 'IN',
  BREAK = 'BREAK',
  CONTINUE = 'CONTINUE',
  PRINT = 'PRINT',

  // Operators
  PLUS = '+',
  MINUS = '-',
  STAR = '*',
  SLASH = '/',
  PERCENT = '%',
  EQ = '=',
  EQEQ = '==',
  NEQ = '!=',
  LT = '<',
  GT = '>',
  LTE = '<=',
  GTE = '>=',
  AND = 'and',
  OR = 'or',
  NOT = 'not',

  // Delimitadores
  LPAREN = '(',
  RPAREN = ')',
  LBRACE = '{',
  RBRACE = '}',
  LBRACKET = '[',
  RBRACKET = ']',
  COMMA = ',',
  DOT = '.',
  COLON = ':',
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

export const KEYWORDS: Record<string, TokenType> = {
  'var':  TokenType.VAR,
  'func': TokenType.FUNC,
  'return': TokenType.RETURN,
  'if': TokenType.IF,
  'elif': TokenType.ELIF,
  'else': TokenType.ELSE,
  'for': TokenType.FOR,
  'while': TokenType.WHILE,
  'in': TokenType.IN,
  'break': TokenType.BREAK,
  'continue': TokenType.CONTINUE,
  'print': TokenType.PRINT,
  'true': TokenType.BOOL,
  'false': TokenType.BOOL,
  'null': TokenType.NULL,
  'and': TokenType.AND,
  'or': TokenType.OR,
  'not': TokenType.NOT,
};

// Token
export class Token {
  constructor(
    public type: TokenType,
    public value: string | number | boolean | null,
    public line: number,
  ) {}

  toString(): string {
    return `Token(${this.type}, ${JSON.stringify(this.value)}, line:${this.line})`;
  }
}

// AST Node Types-
export type ASTNode =
  | ProgramNode
  | VarDeclNode
  | AssignNode
  | FuncDeclNode
  | ReturnNode
  | IfNode
  | WhileNode
  | ForNode
  | BreakNode
  | ContinueNode
  | PrintNode
  | CallNode
  | BinOpNode
  | UnaryOpNode
  | IndexNode
  | MemberNode
  | IdentifierNode
  | NumberLitNode
  | StringLitNode
  | BoolLitNode
  | NullLitNode
  | ArrayLitNode
  | DictLitNode;

export interface ProgramNode { type: 'Program'; body: ASTNode[] }
export interface VarDeclNode { type: 'VarDecl'; name: string; value: ASTNode }
export interface AssignNode { type: 'Assign'; target: ASTNode; value: ASTNode }
export interface FuncDeclNode { type: 'FuncDecl'; name: string; params: string[]; body: ASTNode[] }
export interface ReturnNode { type: 'Return'; value: ASTNode | null }
export interface IfNode { type: 'If'; cond: ASTNode; then: ASTNode[]; elifs: ElifClause[]; els: ASTNode[] | null }
export interface ElifClause { cond: ASTNode; body: ASTNode[] }
export interface WhileNode { type: 'While'; cond: ASTNode; body: ASTNode[] }
export interface ForNode { type: 'For'; ident: string; iter: ASTNode; body: ASTNode[] }
export interface BreakNode { type: 'Break' }
export interface ContinueNode { type: 'Continue' }
export interface PrintNode { type: 'Print'; args: ASTNode[] }
export interface CallNode { type: 'Call'; callee: ASTNode; args: ASTNode[] }
export interface BinOpNode { type: 'BinOp'; op: string; left: ASTNode; right: ASTNode }
export interface UnaryOpNode { type: 'UnaryOp'; op: string; operand: ASTNode }
export interface IndexNode { type: 'Index'; obj: ASTNode; index: ASTNode }
export interface MemberNode { type: 'Member'; obj: ASTNode; prop: string }
export interface IdentifierNode { type: 'Identifier'; name: string }
export interface NumberLitNode  { type: 'NumberLit';  value: number }
export interface StringLitNode { type: 'StringLit'; value: string }
export interface BoolLitNode { type: 'BoolLit'; value: boolean }
export interface NullLitNode { type: 'NullLit' }
export interface ArrayLitNode { type: 'ArrayLit'; elements: ASTNode[] }
export interface DictLitNode { type: 'DictLit'; pairs: [ASTNode, ASTNode][] }

// Runtime Values-
export type KerlValue =
  | null
  | boolean
  | number
  | string
  | KerlValue[]
  | Map<KerlValue, KerlValue>
  | KerlFunction
  | NativeFunction
  | KerlModule
  | ReactiveVar;

export class KerlFunction {
  constructor(
    public name: string,
    public params: string[],
    public body: ASTNode[],
    public closure: Environment,
  ) {}
  toString(): string { return `<func ${this.name}>`; }
}

export class KerlModule {
  constructor(public exports: Map<string, KerlValue>) {}
  toString(): string { return '<module>'; }
}

export class ReactiveVar {
  private _value: KerlValue = null;

  constructor(
    public sourceEnv:  Environment,
    public sourceName: string,
    public fn: KerlFunction | NativeFunction,
    public interpreter: { callFunction(fn: KerlFunction | NativeFunction, args: KerlValue[]): KerlValue },
  ) {
    this._compute();
  }

  private _compute(): void {
    const raw = this.sourceEnv.getRaw(this.sourceName);
    const src = raw instanceof ReactiveVar ? raw.get() : raw;
    this._value = this.interpreter.callFunction(this.fn, [src]);
  }

  get(): KerlValue { return this._value; }
  update(): void { this._compute(); }
  toString(): string { return `<reactive>`; }
}

export type NativeFunction = (args: KerlValue[]) => KerlValue;

// Control Flow Signals-
export class ReturnSignal { constructor(public value: KerlValue) {} }
export class BreakSignal {}
export class ContinueSignal {}
export type  Signal = ReturnSignal | BreakSignal | ContinueSignal;

// Environmen-
export class Environment {
  private vars: Map<string, KerlValue> = new Map();
  private watchers: Map<string, ReactiveVar[]> = new Map();

  constructor(public parent: Environment | null = null) {}

  getRaw(name: string): KerlValue {
    if (this.vars.has(name)) return this.vars.get(name)!;
    if (this.parent) return this.parent.getRaw(name);
    throw new Error(`[Error] Undefined variable: '${name}'`);
  }

  get(name: string): KerlValue {
    const raw = this.getRaw(name);
    return raw instanceof ReactiveVar ? raw.get() : raw;
  }

  set(name: string, value: KerlValue): void {
    if (this.vars.has(name)) {
      this.vars.set(name, value);
      this._notify(name);
      return;
    }
    if (this.parent?.has(name)) {
      this.parent.set(name, value);
      return;
    }
    this.vars.set(name, value);
    this._notify(name);
  }

  define(name: string, value: KerlValue): void {
    this.vars.set(name, value);
  }

  has(name: string): boolean {
    return this.vars.has(name) || (this.parent?.has(name) ?? false);
  }

  addWatcher(name: string, reactive: ReactiveVar): void {
    if (!this.watchers.has(name)) this.watchers.set(name, []);
    this.watchers.get(name)!.push(reactive);
  }

  _notify(name: string): void {
    if (this.watchers.has(name)) {
      for (const r of this.watchers.get(name)!) r.update();
    }
    this.parent?._notify(name);
  }

  findEnv(name: string): Environment | null {
    if (this.vars.has(name)) return this;
    return this.parent?.findEnv(name) ?? null;
  }
}
