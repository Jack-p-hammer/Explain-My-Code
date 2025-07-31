# Explain My Code VS Code Extension

A powerful VS Code extension that explains code snippets using LLM APIs with advanced features and beautiful markdown rendering.

## ✨ Features

### 🎯 Core Functionality
- **Explain Selected Code**: Right-click or use keyboard shortcuts to explain highlighted code
- **Explain Entire File**: Explain the complete file content with context
- **Language-Specific Prompts**: Optimized explanations for different programming languages
- **Beautiful Markdown Rendering**: Dark theme with syntax highlighting and proper formatting

### 🚀 Advanced Features
- **Explanation History**: View and reuse previous explanations
- **Copy to Clipboard**: One-click copying of explanations
- **Save Explanations**: Export explanations as markdown or text files
- **Status Bar Integration**: Quick access from the status bar
- **Keyboard Shortcuts**: Fast access with customizable shortcuts
- **Progress Indicators**: Visual feedback during API calls

### ⚙️ Configuration
- **Flexible API Support**: Works with OpenAI, local servers, and other LLM APIs
- **Customizable Settings**: Adjust timeout, max tokens, and model versions
- **Secure Configuration**: API keys stored in VS Code settings

## 🛠️ Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure API Settings**
   - Open VS Code Settings (Ctrl/Cmd + ,)
   - Search for "Explain My Code"
   - Set your API Key, URL, and model version

3. **Launch Extension**
   - Press `F5` in VS Code to launch the extension in a new window
   - Or build and install the extension package

## ⌨️ Usage

### Keyboard Shortcuts
- **Ctrl+Shift+E**: Explain selected code
- **Ctrl+Shift+F**: Explain entire file

### Context Menu
- **Right-click** on selected code → "Explain Selected Code"
- **Right-click** in editor → "Explain Entire File"

### Command Palette
- **Ctrl+Shift+P** → "Explain Selected Code"
- **Ctrl+Shift+P** → "Explain Entire File"
- **Ctrl+Shift+P** → "Show Explanation History"
- **Ctrl+Shift+P** → "Clear Explanation History"

### Status Bar
- Click the lightbulb icon in the status bar to explain selected code

## ⚙️ Configuration Options

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| `apiKey` | Your LLM API Key | - | - |
| `apiUrl` | LLM API endpoint URL | - | - |
| `modelVersion` | Model version to use | `z-ai/glm-4.5-air:free` | - |
| `maxTokens` | Maximum response tokens | `4000` | 100-8000 |
| `timeout` | API request timeout (ms) | `30000` | 5000-120000 |

## 🎨 Features in Detail

### Markdown Rendering
- **Dark Theme**: Easy on the eyes with GitHub-style dark colors
- **Syntax Highlighting**: Code blocks with language detection
- **Rich Formatting**: Headers, lists, tables, blockquotes, and more
- **Responsive Design**: Optimized for different screen sizes

### History Management
- **Persistent Storage**: Explanations saved during session
- **Quick Access**: Browse previous explanations with file context
- **Easy Cleanup**: Clear history with one command

### File Operations
- **Export Options**: Save as markdown or text files
- **Clipboard Integration**: Copy explanations with formatting
- **File Context**: Shows source file information

## 🔧 Development

### Project Structure
```
src/
├── extension.ts          # Main extension logic
├── types/               # TypeScript interfaces
├── services/            # API and utility services
└── ui/                  # UI components
```

### Building
```bash
npm run compile          # Compile TypeScript
npm run watch            # Watch for changes
npm run lint             # Run ESLint
npm run test             # Run tests
```

## 📋 Requirements

- **Node.js**: >= 16.0.0
- **VS Code**: >= 1.70.0
- **TypeScript**: >= 4.7.4

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🐛 Troubleshooting

### Common Issues
- **API Timeout**: Increase the timeout setting in configuration
- **Empty Responses**: Check your API key and URL settings
- **Formatting Issues**: Ensure your LLM supports markdown output

### Support
- Check the [Issues](https://github.com/your-repo/issues) page
- Review the configuration settings
- Verify your API credentials and endpoint 