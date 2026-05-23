#!/usr/bin/env node
/*
@ The person responsible for the update is Dev Dylan, the creator of the language.
*/

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

import { Lexer } from './lexer';
import { Parser } from './parser';
import { Interpreter } from './interpreter';

const VERSION = '0.4.0';

function runCode(source: string, interpreter: Interpreter): void {
  const tokens = new Lexer(source).tokenize();
  const ast = new Parser(tokens).parse();
  interpreter.run(ast);
}

function runFile(filePath: string): void {
  filePath = path.resolve(filePath);
  if (!fs.existsSync(filePath)) {
    console.error(`[Error] File not found: ${filePath}`);
    process.exit(1);
  }
  if (!filePath.endsWith('.ke')) {
    console.warn(`[Warn] the expected extension is .ke`);
  }
  const source = fs.readFileSync(filePath, 'utf8');
  const interpreter = new Interpreter(filePath);
  try {
    runCode(source, interpreter);
  } catch (e: unknown) {
    console.error((e as Error).message);
    process.exit(1);
  }
}

function startRepl(): void {
  const interpreter = new Interpreter();

  console.log(`Kerl v${VERSION} — REPL Type 'exit' to exit | 'help' for help`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  rl.prompt();
  let buffer = '';

  rl.on('line', (line: string) => {
    if (line.trim() === 'sair' || line.trim() === 'exit') {
      console.log('Bye!');
      process.exit(0);
    }
    
    if (line.trim() === 'clear') { buffer = ''; rl.prompt(); return; }

    buffer += line + '\n';
    const open  = (buffer.match(/{/g) || []).length;
    const close = (buffer.match(/}/g) || []).length;
    if (open > close) { process.stdout.write('....  '); return; }

    try {
      runCode(buffer, interpreter);
    } catch (e: unknown) {
      console.error((e as Error).message);
    }
    buffer = '';
    rl.prompt();
  });

  rl.on('close', () => { console.log('\nBye!'); process.exit(0); });
}

// Main
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === 'repl') {
  startRepl();
} else if (args[0] === '--version' || args[0] === '-v') {
  console.log(`Kerl v${VERSION}`);
} else if (args[0] === '--help' || args[0] === '-h') {
;console.log(`
Kerl v${VERSION} — Reactive programming language

Usage:
  kerl arquivo.ke Executes a .ke file
  kerl repl Interactive REPL
  kerl --version Show the version`);
} else {
  runFile(args[0]);
}
