import type { RuleId } from './rules';

export interface SourcePosition {
  line: number;
  column: number;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export interface ContractError {
  ruleId: RuleId;
  message: string;
  range: SourceRange;
}

export interface CellValue {
  source: string;
}

export type HeaderItem =
  | { kind: 'docstring'; source: string }
  | { kind: 'import'; source: string }
  | { kind: 'comment'; source: string }
  | { kind: 'blank' };

export interface Variable {
  name: string;
  schema: string[];
  rows: CellValue[][];
  annotation: string | null;
  leadingComments: string[];
}

export interface FileModel {
  header: HeaderItem[];
  variables: Variable[];
  trailer: HeaderItem[];
}

export interface ParseResult {
  errors: ContractError[];
  model: FileModel | null;
}
