/*
@ NanoSoft - 22/05/2026
@ The person responsible for the update is Dev Dylan, the creator of the language, who believes in the future of NanoSoft. 
*/

import * as fs from 'fs';
import * as path from 'path';

import {
  ASTNode, KerlValue, KerlFunction, KerlModule, ReactiveVar,
  NativeFunction, Environment, ReturnSignal, BreakSignal, ContinueSignal,
} from './types';

type ExecResult = KerlValue | ReturnSignal | BreakSignal | ContinueSignal | null;

export class Interpreter {
  public global: Environment;
  public output: string[] = [];

  constructor(private currentFile: string | null = null) {
    this.global = new Environment();
    this._setupBuiltins();
  }

  // Call Function
  callFunction(fn: KerlFunction | NativeFunction, args: KerlValue[]): KerlValue {
    if (typeof fn === 'function') return (fn as NativeFunction)(args) ?? null;
    if (fn instanceof KerlFunction) {
      const fnEnv = new Environment(fn.closure);
      fn.params.forEach((p, i) => fnEnv.define(p, args[i] ?? null));
      const result = this.execBlock(fn.body, fnEnv);
      if (result instanceof ReturnSignal) return result.value;
      return null;
    }
    throw new Error('[Kerl] Is not a function');
  }

  // Display
  display(val: KerlValue): string {
    if (val === null) return 'null';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (val instanceof ReactiveVar) return this.display(val.get());
    if (Array.isArray(val)) return '[' + val.map(v => this.display(v)).join(', ') + ']';
    if (val instanceof Map) {
      const pairs = [...val.entries()].map(([k, v]) => `${this.display(k)}: ${this.display(v)}`);
      return '{' + pairs.join(', ') + '}';
    }
    if (val instanceof KerlFunction) return val.toString();
    if (val instanceof KerlModule) return val.toString();
    return String(val);
  }

  // Builtins
  private _setupBuiltins(): void {
    const G = this.global;
    const def = (name: string, fn: NativeFunction) => G.define(name, fn);

    def('len', a => {
      const v = a[0];
      if (typeof v === 'string' || Array.isArray(v)) return (v as string | KerlValue[]).length;
      if (v instanceof Map) return v.size;
      throw new Error('[Kerl] len() requires string, array, or dict');
    });

    def('str', a => this.display(a[0]));
    def('num', a => {
      const n = parseFloat(String(a[0]));
      if (isNaN(n)) throw new Error(`[Kerl] num() cannot convert '${a[0]}'`);
      return n;
    });

    def('type', a => {
      const v = a[0];
      if (v === null) return 'null';
      if (typeof v === 'number') return 'number';
      if (typeof v === 'string') return 'string';
      if (typeof v === 'boolean') return 'bool';
      if (Array.isArray(v)) return 'array';
      if (v instanceof Map) return 'dict';
      if (v instanceof KerlFunction) return 'func';
      if (v instanceof ReactiveVar) return 'reactive';
      if (v instanceof KerlModule) return 'module';
      return 'unknown';
    });

    def('range', a => {
      const [s, e, st] = a.length === 1
        ? [0, a[0] as number, 1]
        : [a[0] as number, a[1] as number, (a[2] as number) ?? 1];
      const r: KerlValue[] = [];
      for (let i = s; i < e; i += st) r.push(i);
      return r;
    });

    def('push', a => {
      if (!Array.isArray(a[0])) throw new Error('[Kerl] push() requires array');
      (a[0] as KerlValue[]).push(a[1]);
      return a[0];
    });

    def('pop', a => {
      if (!Array.isArray(a[0])) throw new Error('[Kerl] pop() requires array');
      return (a[0] as KerlValue[]).pop() ?? null;
    });

    def('keys', a => {
      if (!(a[0] instanceof Map)) throw new Error('[Kerl] keys() requires dict');
      return [...(a[0] as Map<KerlValue, KerlValue>).keys()];
    });

    def('values', a => {
      if (!(a[0] instanceof Map)) throw new Error('[Kerl] values() requires dict');
      return [...(a[0] as Map<KerlValue, KerlValue>).values()];
    });

    def('split', a => {
      if (typeof a[0] !== 'string') throw new Error('[Kerl] split() requires string');
      return (a[0] as string).split((a[1] as string) ?? '');
    });

    def('join', a => {
      if (!Array.isArray(a[0])) throw new Error('[Kerl] join() requires array');
      return (a[0] as KerlValue[]).map(x => this.display(x)).join((a[1] as string) ?? '');
    });

    def('upper', a => String(a[0]).toUpperCase());
    def('lower', a => String(a[0]).toLowerCase());
    def('floor', a => Math.floor(a[0] as number));
    def('ceil', a => Math.ceil(a[0] as number));
    def('round', a => Math.round(a[0] as number));
    def('abs', a => Math.abs(a[0] as number));
    def('sqrt', a => Math.sqrt(a[0] as number));
    def('max', a => Math.max(...(a as number[])));
    def('min', a => Math.min(...(a as number[])));
    def('random', () => Math.random());

    def('contains', a => {
      const [col, item] = a;
      if (Array.isArray(col)) return (col as KerlValue[]).includes(item);
      if (typeof col === 'string') return (col as string).includes(item as string);
      if (col instanceof Map) return (col as Map<KerlValue, KerlValue>).has(item);
      return false;
    });

    def('slice', a => {
      const [col, s, e] = a;
      if (Array.isArray(col) || typeof col === 'string')
        return (col as KerlValue[] | string).slice(s as number, e as number);
      throw new Error('[Kerl] slice() requires array or string');
    });

    def('reverse', a => {
      if (Array.isArray(a[0])) return [...(a[0] as KerlValue[])].reverse();
      if (typeof a[0] === 'string')   return (a[0] as string).split('').reverse().join('');
      throw new Error('[Kerl] reverse() requires array or string');
    });

    // load(path) — load module .ke
    def('load', a => {
      const filePath = a[0] as string;
      if (typeof filePath !== 'string') throw new Error('[Kerl] load() requires string');

      let resolved: string;
      if (filePath.startsWith('./') || filePath.startsWith('../')) {
        const base = this.currentFile ? path.dirname(this.currentFile) : process.cwd();
        resolved = path.resolve(base, filePath);
      } else {
        throw new Error(`[Kerl] Module '${filePath}' not found`);
      }

      if (!fs.existsSync(resolved)) throw new Error(`[Kerl] File not found: ${resolved}`);

      const source = fs.readFileSync(resolved, 'utf8');
      const { Lexer } = require('./lexer');
      const { Parser } = require('./parser');

      const sub = new Interpreter(resolved);
      sub.run(new (require('./parser').Parser)(
        new (require('./lexer').Lexer)(source).tokenize()
      ).parse());

      const exports = new Map<string, KerlValue>();
      for (const [k, v] of sub.global['vars'] as Map<string, KerlValue>) {
        exports.set(k, v instanceof ReactiveVar ? v.get() : v);
      }
      return new KerlModule(exports);
    });
  }

  // Run
  run(ast: { body: ASTNode[] }): void {
    this.execBlock(ast.body, this.global);
  }

  execBlock(stmts: ASTNode[], env: Environment): ExecResult {
    for (const stmt of stmts) {
      const result = this.exec(stmt, env);
      if (result instanceof ReturnSignal) return result;
      if (result instanceof BreakSignal) return result;
      if (result instanceof ContinueSignal) return result;
    }
    return null;
  }

  exec(node: ASTNode, env: Environment): ExecResult {
    switch (node.type) {

      case 'Program': return this.execBlock(node.body, env);

      case 'VarDecl': {
        // watch() especial
        if (node.value.type === 'Call') {
          const call = node.value;
          if (call.callee.type === 'Identifier' && call.callee.name === 'watch') {
            const [srcNode, fnNode] = call.args;
            if (!srcNode || srcNode.type !== 'Identifier')
              throw new Error('[Kerl] watch(): first argument must be variable');
            const fn = this.eval(fnNode, env) as KerlFunction | NativeFunction;
            const sourceEnv = env.findEnv(srcNode.name);
            if (!sourceEnv) throw new Error(`[Kerl] watch(): '${srcNode.name}' not found`);
            const reactive = new ReactiveVar(sourceEnv, srcNode.name, fn, this);
            env.define(node.name, reactive);
            sourceEnv.addWatcher(srcNode.name, reactive);
            return null;
          }
        }
        env.define(node.name, this.eval(node.value, env));
        return null;
      }

      case 'Assign': {
        const val = this.eval(node.value, env);
        if (node.target.type === 'Identifier') {
          env.set(node.target.name, val);
        } else if (node.target.type === 'Index') {
          const obj = this.eval(node.target.obj, env);
          const idx = this.eval(node.target.index, env);
          if (Array.isArray(obj)) (obj as KerlValue[])[idx as number] = val;
          else if (obj instanceof Map) (obj as Map<KerlValue, KerlValue>).set(idx, val);
          else throw new Error('[Kerl] It is not possible to index this type');
        } else if (node.target.type === 'Member') {
          const obj = this.eval(node.target.obj, env);
          if (obj instanceof Map) (obj as Map<KerlValue, KerlValue>).set(node.target.prop, val);
          else throw new Error('[Kerl] Invalid member access');
        }
        return val;
      }

      case 'FuncDecl': {
        env.define(node.name, new KerlFunction(node.name, node.params, node.body, env));
        return null;
      }

      case 'Return': return new ReturnSignal(node.value ? this.eval(node.value, env) : null);

      case 'If': {
        if (this.truthy(this.eval(node.cond, env)))
          return this.execBlock(node.then, new Environment(env));
        for (const elif of node.elifs) {
          if (this.truthy(this.eval(elif.cond, env)))
            return this.execBlock(elif.body, new Environment(env));
        }
        if (node.els) return this.execBlock(node.els, new Environment(env));
        return null;
      }

      case 'While': {
        while (this.truthy(this.eval(node.cond, env))) {
          const r = this.execBlock(node.body, new Environment(env));
          if (r instanceof BreakSignal) break;
          if (r instanceof ContinueSignal) continue;
          if (r instanceof ReturnSignal) return r;
        }
        return null;
      }

      case 'For': {
        const iter = this.eval(node.iter, env);
        const items: KerlValue[] = Array.isArray(iter)
          ? iter as KerlValue[]
          : typeof iter === 'string'
          ? (iter as string).split('')
          : iter instanceof Map
          ? [...(iter as Map<KerlValue, KerlValue>).entries()]
          : (() => { throw new Error('[Kerl] for..in requires array, string or dict'); })();

        for (const item of items) {
          const loopEnv = new Environment(env);
          loopEnv.define(node.ident, item);
          const r = this.execBlock(node.body, loopEnv);
          if (r instanceof BreakSignal) break;
          if (r instanceof ContinueSignal) continue;
          if (r instanceof ReturnSignal) return r;
        }
        return null;
      }

      case 'Break': return new BreakSignal();
      case 'Continue': return new ContinueSignal();

      case 'Print': {
        const line = node.args.map(a => this.display(this.eval(a, env))).join(' ');
        this.output.push(line);
        process.stdout.write(line + '\n');
        return null;
      }

      default: return this.eval(node, env);
    }
  }

  eval(node: ASTNode, env: Environment): KerlValue {
    switch (node.type) {
      case 'NumberLit': return node.value;
      case 'StringLit': return node.value;
      case 'BoolLit': return node.value;
      case 'NullLit': return null;
      case 'Identifier': return env.get(node.name);

      case 'ArrayLit':
        return node.elements.map(e => this.eval(e, env));

      case 'DictLit': {
        const map = new Map<KerlValue, KerlValue>();
        for (const [k, v] of node.pairs) map.set(this.eval(k, env), this.eval(v, env));
        return map;
      }

      case 'BinOp':
        return this.binop(node.op, this.eval(node.left, env), this.eval(node.right, env));

      case 'UnaryOp': {
        const v = this.eval(node.operand, env);
        if (node.op === '-')   return -(v as number);
        if (node.op === 'not') return !this.truthy(v);
        throw new Error(`[Kerl] Unknown unary operator: '${node.op}'`);
      }

      case 'Index': {
        const obj = this.eval(node.obj, env);
        const idx = this.eval(node.index, env);
        if (Array.isArray(obj)) return (obj as KerlValue[])[idx as number] ?? null;
        if (typeof obj === 'string') return (obj as string)[idx as number] ?? null;
        if (obj instanceof Map) return (obj as Map<KerlValue, KerlValue>).get(idx) ?? null;
        throw new Error('[Kerl] It is not possible to index this type');
      }

      case 'Member': {
        const obj = this.eval(node.obj, env);
        if (obj instanceof KerlModule) {
          const val = obj.exports.get(node.prop);
          if (val === undefined) throw new Error(`[Kerl] The module does not have '${node.prop}'`);
          return val;
        }
        if (obj instanceof Map) return (obj as Map<KerlValue, KerlValue>).get(node.prop) ?? null;
        throw new Error(`[Kerl] Invalid member access: '${node.prop}'`);
      }

      case 'Call': {
        const callee = this.eval(node.callee, env);
        const args = node.args.map(a => this.eval(a, env));
        return this.callFunction(callee as KerlFunction | NativeFunction, args);
      }

      case 'VarDecl':
      case 'Assign':
      case 'Print':
        return this.exec(node, env) as KerlValue;

      default:
        throw new Error(`[Kerl] Unknown knot: ${(node as ASTNode).type}`);
    }
  }

  truthy(val: KerlValue): boolean {
    if (val instanceof ReactiveVar) return this.truthy(val.get());
    if (val === null || val === false) return false;
    if (typeof val === 'number' && val === 0) return false;
    if (typeof val === 'string' && val === '') return false;
    if (Array.isArray(val) && (val as KerlValue[]).length === 0) return false;
    return true;
  }

  private binop(op: string, l: KerlValue, r: KerlValue): KerlValue {
    if (l instanceof ReactiveVar) l = l.get();
    if (r instanceof ReactiveVar) r = r.get();
    switch (op) {
      case '+':
        if (typeof l === 'string' || typeof r === 'string')
          return this.display(l) + this.display(r);
        return (l as number) + (r as number);
      case '-': return (l as number) - (r as number);
      case '*': return (l as number) * (r as number);
      case '/':
        if (r === 0) throw new Error('[Kerl] Divisão por zero');
        return (l as number) / (r as number);
      case '%': return (l as number) % (r as number);
      case '==': return l === r;
      case '!=': return l !== r;
      case '<': return (l as number) < (r as number);
      case '>': return (l as number) > (r as number);
      case '<=': return (l as number) <= (r as number);
      case '>=': return (l as number) >= (r as number);
      case 'and': return this.truthy(l) ? r : l;
      case 'or': return this.truthy(l) ? l : r;
      default: throw new Error(`[Kerl] Unknown operator: '${op}'`);
    }
  }
}
