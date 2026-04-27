import { describe, expect, it } from 'vitest';
import { parse } from '../../src/core/parser';
import { completionsAt, diagnosticsFor, hoverAt } from '../../src/core/lsp-logic';
import { RULES } from '../../src/core/rules';

describe('diagnosticsFor — R10.2', () => {
  it('converte ContractError em Diagnostic com severity error', () => {
    const src = 'def foo(): pass\n';
    const r = parse(src);
    const diags = diagnosticsFor(r.errors, r.model, src);
    expect(diags).toHaveLength(r.errors.length);
    expect(diags[0]?.severity).toBe('error');
    expect(diags[0]?.message).toContain('R2.2');
  });

  it('R10.5 — funciona em modelo nulo (arquivo inválido)', () => {
    const r = parse('def foo(): pass\n');
    expect(r.model).toBeNull();
    const diags = diagnosticsFor(r.errors, null, 'def foo(): pass\n');
    expect(diags.length).toBeGreaterThan(0);
  });

  it('R5.5 — emite warning para nome não importado em valor de célula', () => {
    const src = 'var = [{"a": pd.NA}]\n';
    const r = parse(src);
    const diags = diagnosticsFor(r.errors, r.model, src);
    const warning = diags.find((d) => d.severity === 'warning');
    expect(warning?.message).toContain('R5.5');
    expect(warning?.message).toContain('pd');
  });

  it('R5.5 — não emite warning quando nome está importado', () => {
    const src = 'import pandas as pd\nvar = [{"a": pd.NA}]\n';
    const r = parse(src);
    const diags = diagnosticsFor(r.errors, r.model, src);
    expect(diags.find((d) => d.severity === 'warning')).toBeUndefined();
  });
});

describe('completionsAt — R10.3', () => {
  it('sugere chaves do schema dentro de dict literal', () => {
    const src = 'var = [{"a": 1, "b": 2}]\n';
    const r = parse(src);
    expect(r.model).not.toBeNull();
    // posição: imediatamente após o `{`
    const brace = src.indexOf('{');
    const items = completionsAt(r.model!, src, { line: 0, column: brace + 1 });
    expect(items.map((i) => i.label)).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('retorna vazio fora de dict literal', () => {
    const src = 'var = []\n';
    const r = parse(src);
    expect(r.model).not.toBeNull();
    const items = completionsAt(r.model!, src, { line: 0, column: 0 });
    expect(items).toEqual([]);
  });
});

describe('hoverAt — R10.4', () => {
  it('mostra preview de até 5 valores correspondentes', () => {
    const src = 'var = [\n  {"a": 1},\n  {"a": 2},\n  {"a": 3},\n  {"a": 4},\n  {"a": 5},\n  {"a": 6},\n]\n';
    const r = parse(src);
    expect(r.model).not.toBeNull();
    // Posição na chave "a" da primeira linha (linha 1, coluna ~3)
    const idx = src.indexOf('"a"');
    const before = src.slice(0, idx);
    const line = before.split('\n').length - 1;
    const col = idx - (before.lastIndexOf('\n') + 1);
    const hover = hoverAt(r.model!, src, { line, column: col + 1 });
    expect(hover).not.toBeNull();
    // Deve mencionar até 5 valores
    expect(hover?.markdown).toContain('1');
    expect(hover?.markdown).toContain('5');
    expect(hover?.markdown).not.toContain('6');
  });

  it('retorna null fora de chave', () => {
    const src = 'var = []\n';
    const r = parse(src);
    expect(r.model).not.toBeNull();
    const hover = hoverAt(r.model!, src, { line: 0, column: 0 });
    expect(hover).toBeNull();
  });
});

describe('R5.5 — referência a nome não importado (helper)', () => {
  it('nomes built-in (None, True, etc.) não disparam warning', () => {
    const src = 'var = [{"a": None, "b": True, "c": False}]\n';
    const r = parse(src);
    const diags = diagnosticsFor(r.errors, r.model, src);
    expect(diags.filter((d) => d.message.includes(RULES.R5_5))).toEqual([]);
  });
});
