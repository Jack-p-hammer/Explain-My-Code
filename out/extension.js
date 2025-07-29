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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const dotenv = __importStar(require("dotenv"));
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
function activate(context) {
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
            const response = await (0, node_fetch_1.default)(API_URL, {
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
                    const panel = vscode.window.createWebviewPanel('explainMyCode', 'Code Explanation', vscode.ViewColumn.Beside, { enableScripts: false });
                    panel.webview.html = `<html><body><pre style='white-space:pre-wrap;word-break:break-word;'>${escapeHtml(explanation)}</pre></body></html>`;
                }
            });
        }
        catch (err) {
            vscode.window.showErrorMessage('Failed to get explanation: ' + err.message);
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function escapeHtml(text) {
    return text.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\'': '&#39;', '"': '&quot;' }[c] || c));
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map