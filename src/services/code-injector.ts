import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IllustrationCandidate } from '../types/messages';
import { AutopicBridge } from './autopic-bridge';

export class CodeInjector {
  public static formatComponentName(title: string): string {
    const clean = title
      .replace(/[^\w\s-]/g, '')
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
    return clean ? `${clean}Illustration` : 'Illustration';
  }

  public static async insertIllustrationAtCursor(options: {
    candidate: IllustrationCandidate;
    color: string;
    framework?: string;
  }): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    const projectRoot = AutopicBridge.getProjectRoot();
    const { candidate, color } = options;

    const componentName = this.formatComponentName(candidate.title || candidate.slug);
    const svgFilename = `${candidate.slug}.svg`;

    // 1. Fetch SVG content
    const svgContent = await AutopicBridge.getSvgContent(candidate.slug, candidate.provider, color);

    // 2. Ensure directories exist
    const publicIllusDir = path.join(projectRoot, 'public', 'illustrations');
    if (!fs.existsSync(publicIllusDir)) {
      fs.mkdirSync(publicIllusDir, { recursive: true });
    }
    const svgFilePath = path.join(publicIllusDir, svgFilename);
    fs.writeFileSync(svgFilePath, svgContent, 'utf8');

    // 3. Generate component file
    const compDir = path.join(projectRoot, 'components', 'illustrations');
    if (!fs.existsSync(compDir)) {
      fs.mkdirSync(compDir, { recursive: true });
    }
    const compFilePath = path.join(compDir, `${componentName}.tsx`);

    const componentCode = `import Image from 'next/image';

interface ${componentName}Props {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export function ${componentName}({
  className = 'w-full h-auto max-w-md mx-auto',
  width = 500,
  height = 400,
  alt = '${candidate.title.replace(/'/g, "\\'")}',
}: ${componentName}Props) {
  return (
    <div className={className}>
      <Image
        src="/illustrations/${svgFilename}"
        alt={alt}
        width={width}
        height={height}
        className="w-full h-auto"
        priority={false}
      />
    </div>
  );
}

export default ${componentName};
`;

    fs.writeFileSync(compFilePath, componentCode, 'utf8');

    // 4. Inject at cursor in the currently open editor (if an editor is active)
    if (editor) {
      const document = editor.document;
      const isJsxTsx = ['typescriptreact', 'javascriptreact', 'typescript', 'javascript'].includes(document.languageId);

      const edit = new vscode.WorkspaceEdit();

      if (isJsxTsx) {
        // Add import at the top of file if not present
        const fileContent = document.getText();
        if (!fileContent.includes(componentName)) {
          const importLine = `import { ${componentName} } from '@/components/illustrations/${componentName}';\n`;
          edit.insert(document.uri, new vscode.Position(0, 0), importLine);
        }

        // Insert JSX tag at current cursor
        const cursorPosition = editor.selection.active;
        const tagSnippet = `<${componentName} className="w-64 h-64 mx-auto" />\n`;
        edit.insert(document.uri, cursorPosition, tagSnippet);
      }

      await vscode.workspace.applyEdit(edit);
    }

    vscode.window.showInformationMessage(
      `✨ ${componentName} généré dans components/illustrations/ et inséré !`
    );
    return true;
  }
}
