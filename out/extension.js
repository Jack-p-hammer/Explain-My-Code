"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const node_fetch_1 = __importDefault(require("node-fetch"));
// Configuration management
class ConfigManager {
    static getConfig() {
        const config = vscode.workspace.getConfiguration('explainMyCode');
        return {
            apiKey: config.get('apiKey') || '',
            apiUrl: config.get('apiUrl') || '',
            modelVersion: config.get('modelVersion') || 'z-ai/glm-4.5-air:free',
            maxTokens: config.get('maxTokens') || 4000,
            timeout: config.get('timeout') || 30000
        };
    }
    static validateConfig() {
        const config = this.getConfig();
        const errors = [];
        if (!config.apiKey)
            errors.push('API Key is required');
        if (!config.apiUrl)
            errors.push('API URL is required');
        if (!config.modelVersion)
            errors.push('Model version is required');
        return { isValid: errors.length === 0, errors };
    }
}
// API service
class ApiService {
    static async makeRequest(config, messages) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        try {
            const response = await (0, node_fetch_1.default)(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                    'HTTP-Referer': 'http://localhost',
                    'X-Title': 'Explain My Code Extension',
                    'User-Agent': 'Explain-My-Code-VSCode-Extension/1.0.0'
                },
                body: JSON.stringify({
                    model: config.modelVersion,
                    messages,
                    max_tokens: config.maxTokens,
                    temperature: 0.3
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            throw error;
        }
    }
    static async getExplanation(selectedText, fullFileText, language) {
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
    static getSystemPrompt(language) {
        const basePrompt = "You are an expert code reviewer and software engineer. Explain the selected code clearly and concisely, using the full file as context. Format your response using markdown for better readability with headers, code blocks, bullet points, and proper formatting.";
        if (language) {
            return `${basePrompt} Focus on ${language}-specific best practices and conventions.`;
        }
        return basePrompt;
    }
    static parseResponse(response) {
        if (response.error) {
            throw new Error(response.error);
        }
        if (response.choices && response.choices[0] && response.choices[0].message) {
            return response.choices[0].message.content;
        }
        else if (response.response) {
            return response.response;
        }
        else if (response.explanation) {
            return response.explanation;
        }
        else {
            throw new Error('Unexpected API response format');
        }
    }
}
// Explanation manager
class ExplanationManager {
    static addExplanation(result) {
        this.explanations.unshift(result);
        // Keep only last 50 explanations
        if (this.explanations.length > 50) {
            this.explanations = this.explanations.slice(0, 50);
        }
    }
    static getHistory() {
        return [...this.explanations];
    }
    static clearHistory() {
        this.explanations = [];
    }
}
ExplanationManager.explanations = [];
// UI utilities
class UIUtils {
    static async showExplanation(explanation, filePath, selectedText) {
        const panel = vscode.window.createWebviewPanel('explainMyCode', 'Code Explanation', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = this.getMarkdownHtml(explanation, filePath, selectedText);
        // Add copy functionality
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'copy':
                    vscode.env.clipboard.writeText(explanation);
                    vscode.window.showInformationMessage('Explanation copied to clipboard!');
                    break;
                case 'save':
                    this.saveExplanation(explanation, filePath);
                    break;
            }
        });
    }
    static async saveExplanation(explanation, filePath) {
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
            }
            catch (error) {
                vscode.window.showErrorMessage('Failed to save explanation: ' + error);
            }
        }
    }
    static getMarkdownHtml(markdown, filePath, selectedText) {
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
    static convertMarkdownToHtml(markdown) {
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
    constructor(context) {
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.setupCommands();
        this.setupStatusBar();
    }
    setupCommands() {
        // Main explain command
        const explainCommand = vscode.commands.registerCommand('explainMyCode.explain', () => {
            this.explainSelectedCode();
        });
        // Explain entire file command
        const explainFileCommand = vscode.commands.registerCommand('explainMyCode.explainFile', () => {
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
        this.context.subscriptions.push(explainCommand, explainFileCommand, historyCommand, clearHistoryCommand);
    }
    setupStatusBar() {
        this.statusBarItem.text = '$(lightbulb) Explain Code';
        this.statusBarItem.tooltip = 'Click to explain selected code';
        this.statusBarItem.command = 'explainMyCode.explain';
        this.statusBarItem.show();
        this.context.subscriptions.push(this.statusBarItem);
    }
    async explainSelectedCode() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (!selectedText) {
            vscode.window.showErrorMessage('No code selected. Please select some code to explain.');
            return;
        }
        await this.processExplanation(selectedText, editor.document.getText(), editor.document.fileName, editor.document.languageId);
    }
    async explainEntireFile() {
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
    async processExplanation(selectedText, fullFileText, filePath, language, isFullFile = false) {
        // Validate configuration
        const configValidation = ConfigManager.validateConfig();
        if (!configValidation.isValid) {
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to get explanation: ${error.message}`);
        }
    }
    async showHistory() {
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
function activate(context) {
    new ExplainMyCodeExtension(context);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map