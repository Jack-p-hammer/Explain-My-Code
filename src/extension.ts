import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

// Types and interfaces
interface ExtensionConfig {
  apiKey: string;
  apiUrl: string;
  modelVersion: string;
  maxTokens: number;
  timeout: number;
}

interface ApiResponse {
  choices?: Array<{ message?: { content: string } }>;
  response?: string;
  explanation?: string;
  error?: string;
}

interface ExplanationResult {
  content: string;
  timestamp: Date;
  filePath: string;
  selectedText: string;
}

// Configuration management
class ConfigManager {
  static getConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration('explainMyCode');
    return {
      apiKey: config.get<string>('apiKey') || '',
      apiUrl: config.get<string>('apiUrl') || '',
      modelVersion: config.get<string>('modelVersion') || 'z-ai/glm-4.5-air:free',
      maxTokens: config.get<number>('maxTokens') || 4000,
      timeout: config.get<number>('timeout') || 30000
    };
  }

  static validateConfig(): { isValid: boolean; errors: string[] } {
    const config = this.getConfig();
    const errors: string[] = [];

    if (!config.apiKey) errors.push('API Key is required');
    if (!config.apiUrl) errors.push('API URL is required');
    if (!config.modelVersion) errors.push('Model version is required');

    return { isValid: errors.length === 0, errors };
  }
}

// API service
class ApiService {
  private static async makeRequest(config: ExtensionConfig, messages: any[]): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      const url = new URL(config.apiUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const postData = JSON.stringify({
        model: config.modelVersion,
        messages,
        max_tokens: config.maxTokens,
        temperature: 0.3
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'HTTP-Referer': 'http://localhost',
          'X-Title': 'Explain My Code Extension',
          'User-Agent': 'Explain-My-Code-VSCode-Extension/1.0.0',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: config.timeout
      };

      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const response = JSON.parse(data);
              resolve(response);
            } else {
              reject(new Error(`API error: ${res.statusCode} ${res.statusMessage}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out. Please try again.'));
      });

      req.write(postData);
      req.end();
    });
  }

  static async getExplanation(selectedText: string, fullFileText: string, language?: string): Promise<string> {
    const config = ConfigManager.getConfig();
    
    const systemPrompt = this.getSystemPrompt(language);
    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Here is the full file for context:\n\n${fullFileText}`
      },
      {
        role: "user",
        content: `Explain the following selected code:\n\n${selectedText}`
      }
    ];

    const response = await this.makeRequest(config, messages);
    return this.parseResponse(response);
  }

  private static getSystemPrompt(language?: string): string {
    const basePrompt = "You are an expert code reviewer and software engineer. Explain the selected code clearly and concisely, using the full file as context. Format your response using markdown for better readability with headers, code blocks, bullet points, and proper formatting.";
    
    if (language) {
      return `${basePrompt} Focus on ${language}-specific best practices and conventions.`;
    }
    
    return basePrompt;
  }

  private static parseResponse(response: ApiResponse): string {
    if (response.error) {
      throw new Error(response.error);
    }

    if (response.choices && response.choices[0] && response.choices[0].message) {
      return response.choices[0].message.content;
    } else if (response.response) {
      return response.response;
    } else if (response.explanation) {
      return response.explanation;
    } else {
      throw new Error('Unexpected API response format');
    }
  }
}

// Explanation manager
class ExplanationManager {
  private static explanations: ExplanationResult[] = [];

  static addExplanation(result: ExplanationResult): void {
    this.explanations.unshift(result);
    // Keep only last 50 explanations
    if (this.explanations.length > 50) {
      this.explanations = this.explanations.slice(0, 50);
    }
  }

  static getHistory(): ExplanationResult[] {
    return [...this.explanations];
  }

  static clearHistory(): void {
    this.explanations = [];
  }
}

// UI utilities
class UIUtils {
  static async showExplanation(explanation: string, filePath: string, selectedText: string): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'explainMyCode',
      'Code Explanation',
      vscode.ViewColumn.Beside,
      { 
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.getMarkdownHtml(explanation, filePath, selectedText);

    // Add copy functionality
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'copy':
            vscode.env.clipboard.writeText(explanation);
            vscode.window.showInformationMessage('Explanation copied to clipboard!');
            break;
          case 'save':
            this.saveExplanation(explanation, filePath);
            break;
        }
      }
    );
  }

  private static async saveExplanation(explanation: string, filePath: string): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`${filePath}_explanation.md`),
      filters: {
        'Markdown files': ['md'],
        'Text files': ['txt']
      }
    });

    if (uri) {
      try {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(explanation, 'utf8'));
        vscode.window.showInformationMessage('Explanation saved successfully!');
      } catch (error) {
        vscode.window.showErrorMessage('Failed to save explanation: ' + error);
      }
    }
  }

  private static getMarkdownHtml(markdown: string, filePath: string, selectedText: string): string {
    const html = this.convertMarkdownToHtml(markdown);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            color: #e1e4e8;
            background-color: #0d1117;
          }
          .header {
            background-color: #21262d;
            padding: 12px 20px;
            border-bottom: 1px solid #30363d;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .file-info {
            font-size: 0.9em;
            color: #8b949e;
          }
          .actions {
            display: flex;
            gap: 8px;
          }
          .btn {
            background-color: #21262d;
            border: 1px solid #30363d;
            color: #e1e4e8;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background-color 0.2s;
          }
          .btn:hover {
            background-color: #30363d;
          }
          .content {
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1, h2, h3, h4, h5, h6 {
            color: #f0f6fc;
            margin-top: 24px;
            margin-bottom: 16px;
          }
          h1 { font-size: 2em; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
          h2 { font-size: 1.5em; border-bottom: 1px solid #30363d; padding-bottom: 6px; }
          h3 { font-size: 1.25em; }
          h4 { font-size: 1.1em; }
          h5 { font-size: 1em; }
          h6 { font-size: 0.9em; }
          code {
            background-color: #21262d;
            color: #f0f6fc;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 0.9em;
          }
          pre {
            background-color: #21262d;
            color: #f0f6fc;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            border: 1px solid #30363d;
          }
          pre code {
            background-color: transparent;
            padding: 0;
            color: #f0f6fc;
          }
          ul, ol {
            padding-left: 20px;
          }
          li {
            margin-bottom: 4px;
          }
          strong {
            font-weight: 600;
            color: #f0f6fc;
          }
          em {
            font-style: italic;
          }
          blockquote {
            border-left: 4px solid #30363d;
            margin: 16px 0;
            padding-left: 16px;
            color: #8b949e;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
          }
          th, td {
            border: 1px solid #30363d;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #21262d;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="file-info">
            📄 ${filePath.split('/').pop() || filePath}
          </div>
          <div class="actions">
            <button class="btn" onclick="copyExplanation()">📋 Copy</button>
            <button class="btn" onclick="saveExplanation()">💾 Save</button>
          </div>
        </div>
        <div class="content">
          ${html}
        </div>
        <script>
          const vscode = acquireVsCodeApi();
          
          function copyExplanation() {
            vscode.postMessage({ command: 'copy' });
          }
          
          function saveExplanation() {
            vscode.postMessage({ command: 'save' });
          }
        </script>
      </body>
      </html>
    `;
  }

  private static convertMarkdownToHtml(markdown: string): string {
    let html = markdown
      // Headers - handle all header levels properly
      .replace(/^#{1,6}\s+(.*$)/gim, (match, content) => {
        const headerMatch = match.match(/^#+/);
        const level = headerMatch ? headerMatch[0].length : 1;
        return `<h${Math.min(level, 6)}>${content}</h${Math.min(level, 6)}>`;
      })
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks with language detection
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Inline code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Tables (basic support)
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').slice(1, -1);
        return '<tr>' + cells.map(cell => `<td>${cell.trim()}</td>`).join('') + '</tr>';
      })
      // Line breaks
      .replace(/\n/g, '<br>');

    // Wrap lists in ul/ol tags
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Wrap table rows in table tags
    html = html.replace(/(<tr>.*<\/tr>)/gs, '<table>$1</table>');

    return html;
  }
}

// Main extension class
class ExplainMyCodeExtension {
  private context: vscode.ExtensionContext;
  private statusBarItem: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.setupCommands();
    this.setupStatusBar();
  }

  private setupCommands(): void {
    console.log('Setting up commands...');
    
    // Main explain command
    const explainCommand = vscode.commands.registerCommand('explainMyCode.explain', () => {
      console.log('Explain selected code command triggered');
      this.explainSelectedCode();
    });

    // Explain entire file command
    const explainFileCommand = vscode.commands.registerCommand('explainMyCode.explainFile', () => {
      console.log('Explain entire file command triggered');
      this.explainEntireFile();
    });

    // Show history command
    const historyCommand = vscode.commands.registerCommand('explainMyCode.showHistory', () => {
      this.showHistory();
    });

    // Clear history command
    const clearHistoryCommand = vscode.commands.registerCommand('explainMyCode.clearHistory', () => {
      ExplanationManager.clearHistory();
      vscode.window.showInformationMessage('Explanation history cleared.');
    });

    this.context.subscriptions.push(
      explainCommand,
      explainFileCommand,
      historyCommand,
      clearHistoryCommand
    );
  }

  private setupStatusBar(): void {
    console.log('Setting up status bar...');
    this.statusBarItem.text = '$(lightbulb) Explain Code';
    this.statusBarItem.tooltip = 'Click to explain selected code';
    this.statusBarItem.command = 'explainMyCode.explain';
    this.statusBarItem.show();
    this.context.subscriptions.push(this.statusBarItem);
    console.log('Status bar setup complete');
  }

  private async explainSelectedCode(): Promise<void> {
    console.log('explainSelectedCode called');
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      console.log('No active editor found');
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    console.log('Selected text length:', selectedText.length);
    console.log('File:', editor.document.fileName);
    console.log('Language:', editor.document.languageId);
    
    if (!selectedText) {
      console.log('No text selected');
      vscode.window.showErrorMessage('No code selected. Please select some code to explain.');
      return;
    }

    console.log('Processing explanation...');
    await this.processExplanation(selectedText, editor.document.getText(), editor.document.fileName, editor.document.languageId);
  }

  private async explainEntireFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    const fullFileText = editor.document.getText();
    if (!fullFileText.trim()) {
      vscode.window.showErrorMessage('File is empty.');
      return;
    }

    await this.processExplanation(fullFileText, fullFileText, editor.document.fileName, editor.document.languageId, true);
  }

  private async processExplanation(selectedText: string, fullFileText: string, filePath: string, language?: string, isFullFile: boolean = false): Promise<void> {
    console.log('processExplanation called');
    console.log('File path:', filePath);
    console.log('Language:', language);
    console.log('Is full file:', isFullFile);
    
    // Validate configuration
    const configValidation = ConfigManager.validateConfig();
    console.log('Config validation result:', configValidation);
    
    if (!configValidation.isValid) {
      console.log('Configuration validation failed:', configValidation.errors);
      vscode.window.showErrorMessage(`Configuration error: ${configValidation.errors.join(', ')}`);
      return;
    }

    try {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Receiving explanation from LLM${isFullFile ? ' (entire file)' : ''}...`,
        cancellable: false
      }, async () => {
        const explanation = await ApiService.getExplanation(selectedText, fullFileText, language);
        
        // Store in history
        ExplanationManager.addExplanation({
          content: explanation,
          timestamp: new Date(),
          filePath,
          selectedText: selectedText.substring(0, 100) + (selectedText.length > 100 ? '...' : '')
        });

        // Show explanation
        await UIUtils.showExplanation(explanation, filePath, selectedText);
      });
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to get explanation: ${error.message}`);
    }
  }

  private async showHistory(): Promise<void> {
    const history = ExplanationManager.getHistory();
    
    if (history.length === 0) {
      vscode.window.showInformationMessage('No explanation history found.');
      return;
    }

    const items = history.map((item, index) => ({
      label: `${index + 1}. ${item.filePath.split('/').pop() || item.filePath}`,
      description: item.timestamp.toLocaleString(),
      detail: item.selectedText,
      item
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an explanation from history'
    });

    if (selected) {
      await UIUtils.showExplanation(selected.item.content, selected.item.filePath, selected.item.selectedText);
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Explain My Code extension is now active!');
  
  try {
    new ExplainMyCodeExtension(context);
    console.log('ExplainMyCodeExtension initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ExplainMyCodeExtension:', error);
    vscode.window.showErrorMessage('Failed to initialize Explain My Code extension: ' + error);
  }
}

export function deactivate() {}