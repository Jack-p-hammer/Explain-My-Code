import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('explainMyCode.explain', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText) {
      vscode.window.showErrorMessage('No code selected.');
      return;
    }
    // Placeholder: Will call LLM API here
    vscode.window.showInformationMessage('Explain My Code: Selected code captured.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {} 