import type {
  ContractError,
  FileModel,
  SourcePosition,
  SourceRange,
  Variable,
} from './model';
import { _tokenize, _Token } from './parser';
import { RULES } from './rules';

export interface Diagnostic {
  ruleId: string;
  message: string;
  range: SourceRange;
  severity: 'error' | 'warning';
}

export interface CompletionItem {
  label: string;
  kind: 'key';
}

export interface HoverInfo {
  markdown: string;
  range: SourceRange;
}

const PYTHON_KEYWORDS = new Set([
  'lambda', 'for', 'in', 'if', 'else', 'elif', 'while',
  'and', 'or', 'not', 'is',
  'True', 'False', 'None',
  'await', 'async', 'yield', 'return',
]);

const PYTHON_BUILTINS = new Set([
  'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes',
  'callable', 'chr', 'classmethod', 'compile', 'complex', 'delattr',
  'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float',
  'format', 'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help',
  'hex', 'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len',
  'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object',
  'oct', 'open', 'ord', 'pow', 'print', 'property', 'range', 'repr',
  'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod',
  'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip',
  'NotImplemented', 'Ellipsis',
]);

export function diagnosticsFor(
  errors: ContractError[],
  model: FileModel | null,
  source: string,
): Diagnostic[] {
  const diags: Diagnostic[] = errors.map((e) => ({
    ruleId: e.ruleId,
    message: e.message,
    range: e.range,
    severity: 'error',
  }));
  if (model !== null) {
    diags.push(...findUnimportedReferences(model, source));
  }
  return diags;
}

function findUnimportedReferences(model: FileModel, _source: string): Diagnostic[] {
  const imported = collectImportedNames(model);
  const seen = new Set<string>();
  const diags: Diagnostic[] = [];
  for (const v of model.variables) {
    for (const row of v.rows) {
      for (const cell of row) {
        for (const name of extractFreeNames(cell.source)) {
          if (PYTHON_KEYWORDS.has(name)) continue;
          if (PYTHON_BUILTINS.has(name)) continue;
          if (imported.has(name)) continue;
          if (seen.has(name)) continue;
          seen.add(name);
          diags.push({
            ruleId: RULES.R5_5,
            message: `[${RULES.R5_5}] nome não importado em valor de célula: ${name}`,
            severity: 'warning',
            range: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
          });
        }
      }
    }
  }
  return diags;
}

function collectImportedNames(model: FileModel): Set<string> {
  const names = new Set<string>();
  for (const item of model.header) {
    if (item.kind !== 'import') continue;
    extractImportBindings(item.source, names);
  }
  return names;
}

function extractImportBindings(src: string, into: Set<string>): void {
  const { tokens } = _tokenize(src);
  let i = 0;
  if (tokens[i]?.value === 'import') {
    i++;
    parseImportNames(tokens, i, into);
    return;
  }
  if (tokens[i]?.value === 'from') {
    i++;
    while (
      i < tokens.length &&
      (tokens[i]?.value === '.' || (tokens[i]?.type === 'NAME' && tokens[i]?.value !== 'import'))
    ) {
      i++;
    }
    if (tokens[i]?.value !== 'import') return;
    i++;
    if (tokens[i]?.value === '(') i++;
    parseImportNames(tokens, i, into);
  }
}

function parseImportNames(tokens: _Token[], start: number, into: Set<string>): void {
  let i = start;
  while (i < tokens.length) {
    const t = tokens[i];
    if (!t || t.type === 'EOF' || t.type === 'NEWLINE') break;
    if (t.value === ')') break;
    if (t.value === '*') return;
    if (t.type !== 'NAME') break;
    const firstName = t.value;
    i++;
    while (tokens[i]?.value === '.' && tokens[i + 1]?.type === 'NAME') {
      i += 2;
    }
    if (tokens[i]?.value === 'as' && tokens[i + 1]?.type === 'NAME') {
      i++;
      into.add(tokens[i]!.value);
      i++;
    } else {
      into.add(firstName);
    }
    if (tokens[i]?.value === ',') {
      i++;
      continue;
    }
    break;
  }
}

function extractFreeNames(exprSource: string): string[] {
  const { tokens } = _tokenize(exprSource);
  const names: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type !== 'NAME') continue;
    const prev = tokens[i - 1];
    if (prev?.type === 'OP' && prev.value === '.') continue;
    names.push(t.value);
  }
  return names;
}

function positionToOffset(source: string, position: SourcePosition): number {
  let line = 0;
  let col = 0;
  for (let i = 0; i < source.length; i++) {
    if (line === position.line && col === position.column) return i;
    if (source[i] === '\n') {
      line++;
      col = 0;
    } else {
      col++;
    }
  }
  return source.length;
}

function getVarFromModel(model: FileModel, name: string): Variable | null {
  return model.variables.find((v) => v.name === name) ?? null;
}

function walkToOffset(source: string, offset: number): {
  curVar: string | null;
  curlyDepth: number;
} {
  const { tokens } = _tokenize(source);
  let curVar: string | null = null;
  let stmtStart = true;
  let curlyDepth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type === 'EOF') break;
    if (t.type === 'NEWLINE') {
      stmtStart = true;
      curVar = null;
      continue;
    }
    if (t.start >= offset) break;
    if (stmtStart && t.type === 'NAME') {
      curVar = t.value;
    }
    stmtStart = false;
    if (t.type === 'OP') {
      if (t.value === '{') curlyDepth++;
      else if (t.value === '}') curlyDepth--;
    }
  }

  return { curVar, curlyDepth };
}

export function completionsAt(
  model: FileModel,
  source: string,
  position: SourcePosition,
): CompletionItem[] {
  const offset = positionToOffset(source, position);
  const ctx = walkToOffset(source, offset);
  if (ctx.curlyDepth === 0) return [];
  if (ctx.curVar === null) return [];
  const v = getVarFromModel(model, ctx.curVar);
  if (v === null) return [];
  return v.schema.map((k) => ({ label: k, kind: 'key' }));
}

export function hoverAt(
  model: FileModel,
  source: string,
  position: SourcePosition,
): HoverInfo | null {
  const offset = positionToOffset(source, position);
  const { tokens } = _tokenize(source);

  let curVar: string | null = null;
  let stmtStart = true;
  let curlyDepth = 0;
  let keyTok: _Token | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.type === 'EOF') break;
    if (t.type === 'NEWLINE') {
      stmtStart = true;
      curVar = null;
      continue;
    }
    if (
      offset >= t.start &&
      offset <= t.end &&
      t.type === 'STRING' &&
      t.flavor === 'plain' &&
      curlyDepth > 0
    ) {
      keyTok = t;
      break;
    }
    if (stmtStart && t.type === 'NAME') {
      curVar = t.value;
    }
    stmtStart = false;
    if (t.type === 'OP') {
      if (t.value === '{') curlyDepth++;
      else if (t.value === '}') curlyDepth--;
    }
  }

  if (keyTok === null || curVar === null) return null;
  const v = getVarFromModel(model, curVar);
  if (v === null) return null;
  const keyValue = keyTok.parsedString ?? '';
  const colIdx = v.schema.indexOf(keyValue);
  if (colIdx === -1) return null;
  const sample = v.rows.slice(0, 5).map((r, i) => `${i + 1}. ${r[colIdx]?.source ?? ''}`);
  return {
    markdown: `**${keyValue}** — primeiros valores:\n\n${sample.join('\n')}`,
    range: {
      start: { line: keyTok.line, column: keyTok.column },
      end: { line: keyTok.endLine, column: keyTok.endColumn },
    },
  };
}
