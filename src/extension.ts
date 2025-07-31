import * as vscode from 'vscode';
import fetch from 'node-fetch';

export function activate(context: vscode.ExtensionContext) {
  // Read API key and URL from VS Code settings
  const config = vscode.workspace.getConfiguration('explainMyCode');
  const API_KEY = config.get<string>('apiKey');
  const API_URL = config.get<string>('apiUrl');
  
  if (!API_KEY || !API_URL) {
    vscode.window.showInformationMessage(
      `API key or URL not set. Please go to Settings and set 'Explain My Code: API Key' and 'Explain My Code: API URL'.`
    );
  }

  let disposable = vscode.commands.registerCommand('explainMyCode.explain', async () => {
    const config = vscode.workspace.getConfiguration('explainMyCode');
    const API_KEY = config.get<string>('apiKey');
    const API_URL = config.get<string>('apiUrl');

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
      vscode.window.showErrorMessage('API key or URL not set. Please go to Settings and set them.');
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
          model: "z-ai/glm-4.5-air:free",
          messages: [
            {
              role: "system",
              content: "You are an expert code reviewer. Explain the code clearly and concisely."
            },
            {
              role: "user",
              content: `Explain the following code:\n\n${selectedText}`
            }
          ],
          "max_tokens": 1000
        })
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('API Response:', JSON.stringify(data, null, 2));
      
      // Handle different response formats
      let explanation = '';
      if (data.choices && data.choices[0] && data.choices[0].message) {
        // OpenAI-style response
        explanation = data.choices[0].message.content;
      } else if (data.response) {
        // Some APIs use 'response' field
        explanation = data.response;
      } else if (data.explanation) {
        // Your expected format
        explanation = data.explanation;
      } else {
        // Fallback to stringify the whole response
        explanation = JSON.stringify(data, null, 2);
      }
      
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