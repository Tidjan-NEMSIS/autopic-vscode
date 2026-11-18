/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: 'var(--vscode-editor-background, #1e1e1e)',
          fg: 'var(--vscode-editor-foreground, #cccccc)',
          sidebarBg: 'var(--vscode-sideBar-background, #252526)',
          sidebarFg: 'var(--vscode-sideBar-foreground, #cccccc)',
          border: 'var(--vscode-panel-border, #333333)',
          inputBg: 'var(--vscode-input-background, #3c3c3c)',
          inputFg: 'var(--vscode-input-foreground, #cccccc)',
          inputBorder: 'var(--vscode-input-border, #3c3c3c)',
          buttonBg: 'var(--vscode-button-background, #0e639c)',
          buttonFg: 'var(--vscode-button-foreground, #ffffff)',
          buttonHover: 'var(--vscode-button-hoverBackground, #1177bb)',
          badgeBg: 'var(--vscode-badge-background, #4d4d4d)',
          badgeFg: 'var(--vscode-badge-foreground, #ffffff)',
        }
      }
    },
  },
  plugins: [],
}
