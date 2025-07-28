# Explain My Code VS Code Extension

Explain selected code using an LLM API.

## Features
- Right-click or use the command palette to explain selected code
- Configurable LLM API endpoint and key via `.env`
- Explanation shown in a popup (WebView coming soon)

## Setup
1. Clone this repo
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your API details
4. Press F5 in VS Code to launch the extension in a new window

## Configuration
- `.env` file in the root:
  - `LLM_API_KEY`: Your API key
  - `LLM_API_URL`: LLM API endpoint

## Usage
- Select code in the editor
- Right-click and choose "Explain Selected Code" or run "Explain My Code" from the command palette

## Requirements
- Node.js >= 16
- VS Code >= 1.70.0 