import type { FileModel } from './model';
import { addColumn, addRow, getVariable, setCell } from './operations';

export function parseTsv(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines.map((line) => line.split('\t'));
}

export function toPythonStringLiteral(raw: string): string {
  let out = '"';
  for (const ch of raw) {
    switch (ch) {
      case '\\':
        out += '\\\\';
        break;
      case '"':
        out += '\\"';
        break;
      case '\n':
        out += '\\n';
        break;
      case '\r':
        out += '\\r';
        break;
      case '\t':
        out += '\\t';
        break;
      default:
        out += ch;
    }
  }
  out += '"';
  return out;
}

export function applyPaste(
  model: FileModel,
  varName: string,
  startRow: number,
  startCol: number,
  tsv: string[][],
): FileModel {
  let cur = getVariable(model, varName);
  if (cur === null) {
    throw new Error(`[paste] variável não existe: ${varName}`);
  }

  const tsvRows = tsv.length;
  const tsvCols = tsv.reduce((max, row) => Math.max(max, row.length), 0);
  const neededCols = startCol + tsvCols;
  const neededRows = startRow + tsvRows;

  let m = model;

  while (cur.schema.length < neededCols) {
    m = addColumn(m, varName, `col_${cur.schema.length + 1}`);
    cur = getVariable(m, varName) as typeof cur;
  }

  while (cur.rows.length < neededRows) {
    m = addRow(m, varName);
    cur = getVariable(m, varName) as typeof cur;
  }

  for (let r = 0; r < tsvRows; r++) {
    const tsvRow = tsv[r]!;
    for (let c = 0; c < tsvRow.length; c++) {
      const colName = cur.schema[startCol + c]!;
      m = setCell(
        m,
        varName,
        startRow + r,
        colName,
        toPythonStringLiteral(tsvRow[c]!),
      );
    }
  }

  return m;
}
