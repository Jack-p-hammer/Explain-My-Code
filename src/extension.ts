import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

// Load .env from workspace root
const workspaceFolders = vscode.workspace.workspaceFolders;
if (workspaceFolders && workspaceFolders.length > 0) {
  const envPath = path.join(workspaceFolders[0].uri.fsPath, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const API_KEY = process.env.LLM_API_KEY;
const API_URL = process.env.LLM_API_URL;

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

    if (!API_KEY || !API_URL) {
      console.log('API_KEY:', API_KEY, 'API_URL:', API_URL);
      vscode.window.showErrorMessage('NEW: LLM API key or URL not set in .env.');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'HTTP-Referer': 'http://localhost',
        },
        body: JSON.stringify({
          model: "gryphe/gwen-3-8b",
          messages: [
            {
              role: "system",
              content: "You are an expert code reviewer. Explain the code clearly and concisely."
            },
            {
              role: "user",
              content: `Explain the following code:\n\n${selectedText}`
            }
          ]
        })
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      const explanation = data.explanation || JSON.stringify(data);
      vscode.window.showInformationMessage('Explanation received. Click to view.', 'View').then(selection => {
        if (selection === 'View') {
          const panel = vscode.window.createWebviewPanel(
            'explainMyCode',
            'Code Explanation',
            vscode.ViewColumn.Beside,
            { enableScripts: false }
          );
          panel.webview.html = `<html><body><pre style='white-space:pre-wrap;word-break:break-word;'>${escapeHtml(explanation)}</pre></body></html>`;
        }
      });
    } catch (err: any) {
      vscode.window.showErrorMessage('Failed to get explanation: ' + err.message);
    }
  });
  context.subscriptions.push(disposable);
}

function escapeHtml(text: string) {
  return text.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[c]||c));
}

export function deactivate() {}