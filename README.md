# Explain My Code

A VS Code extension that explains code snippets using LLM APIs. Select any code in your editor and get a detailed explanation with proper markdown formatting.

## Features

- **Code Explanation**: Get detailed explanations of selected code snippets
- **Full File Analysis**: Explain entire files with context
- **History Management**: View and manage your explanation history
- **Copy & Save**: Copy explanations to clipboard or save as markdown files
- **Language-Specific Prompts**: Optimized explanations for different programming languages
- **Beautiful Markdown Rendering**: Dark theme with syntax highlighting and proper formatting

## Installation

1. Open VS Code Extensions (Ctrl+Shift+X)
2. Search for "Explain My Code"
3. Click Install

## Configuration

After installation, you need to configure your LLM API settings:

### 1. Get an API Key

This extension works with any LLM API that follows the OpenAI-compatible format. For a free option, you can use OpenRouter with the GLM 4.5 Air model:

1. Visit [OpenRouter](https://openrouter.ai/z-ai/glm-4.5-air:free/api)
2. Create an account and get your API key
3. The GLM 4.5 Air model is free and supports 131,072 context tokens

### 2. Configure the Extension

1. Open VS Code Settings (Ctrl+,)
2. Search for "Explain My Code"
3. Configure these settings:

**API Key**: Your OpenRouter API key
**API URL**: `https://openrouter.ai/api/v1/chat/completions`
**Model Version**: `z-ai/glm-4.5-air:free`

### 3. Alternative Models

You can also use other models through OpenRouter:
- `openai/gpt-4o` (paid)
- `anthropic/claude-3.5-sonnet` (paid)
- `meta-llama/llama-3.1-8b-instruct` (free)

## Usage

### Explain Selected Code
1. Select code in any file
2. Right-click and choose "Explain Selected Code"
3. Or use the keyboard shortcut: `Ctrl+Shift+E`

### Explain Entire File
1. Open any code file
2. Right-click and choose "Explain Entire File"
3. Or use the keyboard shortcut: `Ctrl+Shift+F`

### View History
- Use Command Palette (`Ctrl+Shift+P`) and search for "Show Explanation History"
- View previous explanations and reuse them

### Copy or Save Explanations
- Use the "Copy" button to copy the explanation to clipboard
- Use the "Save" button to save the explanation as a markdown file

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `apiKey` | Your LLM API Key | (empty) |
| `apiUrl` | Your LLM API URL | (empty) |
| `modelVersion` | Model version to use | `z-ai/glm-4.5-air:free` |
| `maxTokens` | Maximum response length | 4000 |
| `timeout` | API request timeout (ms) | 30000 |

## Development

This section is for developers who want to contribute to the extension or run it locally.

### Prerequisites
- Node.js (v16 or higher)
- VS Code Extension Development Host

### Setup
```bash
git clone https://github.com/Jack-p-hammer/Explain-My-Code.git
cd Explain-My-Code
npm install
npm run compile
```

### Running Locally
1. Open the project in VS Code
2. Press `F5` to launch the Extension Development Host
3. Test the extension in the new VS Code window

### Building
```bash
npm run compile
vsce package
```

## Troubleshooting

**Extension not working?**
- Check that your API key is correctly configured
- Verify the API URL is correct for your provider
- Ensure you have an active internet connection

**Getting API errors?**
- Verify your API key has sufficient credits
- Check the model name is correct
- Try increasing the timeout setting

**No explanations showing?**
- Make sure you have selected code before running the command
- Check the VS Code Developer Console for error messages

## Contributing

Feel free to submit issues and enhancement requests. If you want to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
- Check the [GitHub Issues](https://github.com/Jack-p-hammer/Explain-My-Code/issues)
- Review the troubleshooting section above
- Ensure your API configuration is correct 