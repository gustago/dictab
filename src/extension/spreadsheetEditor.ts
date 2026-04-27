import * as vscode from 'vscode';
import type { FileModel } from '../core/model';
import { parse } from '../core/parser';
import { serialize } from '../core/serializer';
import {
  addColumn,
  addRow,
  addVariable,
  deleteVariable,
  removeColumn,
  removeRow,
  renameColumn,
  renameVariable,
  setCell,
} from '../core/operations';
import { applyPaste, parseTsv } from '../core/paste';
import { getWebviewHtml } from '../webview/template';

type IncomingMessage =
  | { kind: 'addVariable'; name: string }
  | { kind: 'deleteVariable'; name: string }
  | { kind: 'renameVariable'; oldName: string; newName: string }
  | { kind: 'addColumn'; varName: string; columnName: string }
  | { kind: 'removeColumn'; varName: string; columnName: string }
  | { kind: 'renameColumn'; varName: string; oldName: string; newName: string }
  | { kind: 'addRow'; varName: string }
  | { kind: 'removeRow'; varName: string; rowIdx: number }
  | { kind: 'setCell'; varName: string; rowIdx: number; columnName: string; expression: string }
  | { kind: 'paste'; varName: string; row: number; col: number; tsv: string };

export class SpreadsheetEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'dictab.spreadsheet';

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      SpreadsheetEditorProvider.viewType,
      new SpreadsheetEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } },
    );
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    panel.webview.options = { enableScripts: true };
    panel.webview.html = getWebviewHtml(panel.webview, this.context.extensionUri);

    const initial = parse(document.getText());
    if (initial.model === null) {
      const first = initial.errors[0];
      vscode.window.showErrorMessage(
        `dictab: arquivo inválido — ${first?.message ?? 'erro desconhecido'}`,
      );
      return;
    }

    const send = (model: FileModel): void => {
      panel.webview.postMessage({ kind: 'state', model });
    };

    send(initial.model);

    const docSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      const r = parse(document.getText());
      if (r.model !== null) send(r.model);
    });

    const msgSub = panel.webview.onDidReceiveMessage(async (msg: IncomingMessage) => {
      const r = parse(document.getText());
      if (r.model === null) return;
      let next: FileModel;
      try {
        next = applyMutation(r.model, msg);
      } catch (err) {
        vscode.window.showErrorMessage(
          `dictab: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
      const newSource = serialize(next);
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        newSource,
      );
      await vscode.workspace.applyEdit(edit);
    });

    panel.onDidDispose(() => {
      docSub.dispose();
      msgSub.dispose();
    });
  }
}

function applyMutation(model: FileModel, msg: IncomingMessage): FileModel {
  switch (msg.kind) {
    case 'addVariable':
      return addVariable(model, msg.name);
    case 'deleteVariable':
      return deleteVariable(model, msg.name);
    case 'renameVariable':
      return renameVariable(model, msg.oldName, msg.newName);
    case 'addColumn':
      return addColumn(model, msg.varName, msg.columnName);
    case 'removeColumn':
      return removeColumn(model, msg.varName, msg.columnName);
    case 'renameColumn':
      return renameColumn(model, msg.varName, msg.oldName, msg.newName);
    case 'addRow':
      return addRow(model, msg.varName);
    case 'removeRow':
      return removeRow(model, msg.varName, msg.rowIdx);
    case 'setCell':
      return setCell(model, msg.varName, msg.rowIdx, msg.columnName, msg.expression);
    case 'paste':
      return applyPaste(model, msg.varName, msg.row, msg.col, parseTsv(msg.tsv));
  }
}
