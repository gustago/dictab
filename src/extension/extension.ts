import * as vscode from 'vscode';
import { registerLanguageFeatures } from './diagnostics';
import { SpreadsheetEditorProvider } from './spreadsheetEditor';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(SpreadsheetEditorProvider.register(context));
  registerLanguageFeatures(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('dictab.openSpreadsheet', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.fileName.endsWith('.t.py')) {
        vscode.window.showErrorMessage(
          'dictab: este comando só funciona em arquivos .t.py',
        );
        return;
      }
      await vscode.commands.executeCommand(
        'vscode.openWith',
        editor.document.uri,
        'dictab.spreadsheet',
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dictab.openSource', async () => {
      const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
      if (
        tab?.input instanceof vscode.TabInputCustom &&
        tab.input.viewType === 'dictab.spreadsheet'
      ) {
        await vscode.commands.executeCommand(
          'vscode.openWith',
          tab.input.uri,
          'default',
        );
      }
    }),
  );
}

export function deactivate(): void {
  // nada
}
