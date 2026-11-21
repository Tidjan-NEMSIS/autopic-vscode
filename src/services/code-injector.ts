import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IllustrationCandidate, ProjectContext } from '../types/messages';
import { AutopicBridge } from './autopic-bridge';

type SupportedFramework = ProjectContext['framework'];

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
    const framework = this.resolveFramework(options.framework, editor?.document.languageId);

    const componentName = this.formatComponentName(candidate.title || candidate.slug);
    const svgFilename = `${candidate.slug}.svg`;
    const svgContent = await AutopicBridge.getSvgContent(
      candidate.slug,
      candidate.provider,
      color
    );

    const svgDir =
      framework === 'flutter'
        ? path.join(projectRoot, 'assets', 'illustrations')
        : path.join(projectRoot, 'public', 'illustrations');
    fs.mkdirSync(svgDir, { recursive: true });
    const svgFilePath = path.join(svgDir, svgFilename);
    fs.writeFileSync(svgFilePath, svgContent, 'utf8');

    const componentDir = this.getComponentDir(projectRoot, framework);
    fs.mkdirSync(componentDir, { recursive: true });
    const componentPath = path.join(componentDir, `${componentName}${this.getExtension(framework)}`);
    fs.writeFileSync(componentPath, this.generateComponent(framework, componentName, candidate, svgFilename), 'utf8');

    if (editor) {
      await this.injectUsage(editor, framework, componentName, componentPath, candidate, svgFilePath);
    }

    const relative = path.relative(projectRoot, componentPath).replace(/\\/g, '/');
    vscode.window.showInformationMessage(`Illustration générée : ${relative}`);
    return true;
  }

  private static resolveFramework(framework?: string, languageId?: string): SupportedFramework {
    if (framework && ['react', 'nextjs', 'vue', 'svelte', 'flutter', 'html'].includes(framework)) {
      return framework as SupportedFramework;
    }

    if (languageId === 'vue') return 'vue';
    if (languageId === 'svelte') return 'svelte';
    if (languageId === 'dart') return 'flutter';
    if (languageId === 'html') return 'html';
    return 'react';
  }

  private static getExtension(framework: SupportedFramework): string {
    switch (framework) {
      case 'vue':
        return '.vue';
      case 'svelte':
        return '.svelte';
      case 'flutter':
        return '.dart';
      case 'html':
        return '.html';
      default:
        return '.tsx';
    }
  }

  private static getComponentDir(projectRoot: string, framework: SupportedFramework): string {
    switch (framework) {
      case 'vue':
        return fs.existsSync(path.join(projectRoot, 'src'))
          ? path.join(projectRoot, 'src', 'components', 'illustrations')
          : path.join(projectRoot, 'components', 'illustrations');
      case 'svelte':
        return fs.existsSync(path.join(projectRoot, 'src', 'lib'))
          ? path.join(projectRoot, 'src', 'lib', 'components', 'illustrations')
          : path.join(projectRoot, 'src', 'components', 'illustrations');
      case 'flutter':
        return path.join(projectRoot, 'lib', 'widgets', 'illustrations');
      default:
        return path.join(projectRoot, 'components', 'illustrations');
    }
  }

  private static generateComponent(
    framework: SupportedFramework,
    componentName: string,
    candidate: IllustrationCandidate,
    svgFilename: string
  ): string {
    const alt = this.escapeSingle(candidate.title || candidate.slug);
    const src = `/illustrations/${svgFilename}`;

    switch (framework) {
      case 'nextjs':
        return `import Image from 'next/image';

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
  alt = '${alt}',
}: ${componentName}Props) {
  return (
    <div className={className}>
      <Image
        src="${src}"
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
      case 'react':
        return `interface ${componentName}Props {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export function ${componentName}({
  className = 'autopic-illustration',
  width = 500,
  height = 400,
  alt = '${alt}',
}: ${componentName}Props) {
  return (
    <img
      src="${src}"
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
    />
  );
}

export default ${componentName};
`;
      case 'vue':
        return `<template>
  <img
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    class="autopic-illustration"
    loading="lazy"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    src?: string;
    alt?: string;
    width?: number;
    height?: number;
  }>(),
  {
    src: '${src}',
    alt: '${alt}',
    width: 500,
    height: 400,
  }
);
</script>

<style scoped>
.autopic-illustration {
  width: 100%;
  height: auto;
  max-width: 480px;
  display: block;
  margin: 1.5rem auto;
}
</style>
`;
      case 'svelte':
        return `<script lang="ts">
  export let src = '${src}';
  export let alt = '${alt}';
  export let width = 500;
  export let height = 400;
</script>

<img {src} {alt} {width} {height} class="autopic-illustration" loading="lazy" />

<style>
  .autopic-illustration {
    width: 100%;
    height: auto;
    max-width: 480px;
    display: block;
    margin: 1.5rem auto;
  }
</style>
`;
      case 'flutter':
        return `import 'package:flutter_svg/flutter_svg.dart';

class ${componentName} extends StatelessWidget {
  const ${componentName}({
    super.key,
    this.width = 500,
    this.height = 400,
  });

  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/${svgFilename}',
      width: width,
      height: height,
      fit: BoxFit.contain,
    );
  }
}
`;
      default:
        return `<img src="${src}" alt="${candidate.title}" class="autopic-illustration" loading="lazy" />`;
    }
  }

  private static async injectUsage(
    editor: vscode.TextEditor,
    framework: SupportedFramework,
    componentName: string,
    componentPath: string,
    candidate: IllustrationCandidate,
    svgFilePath: string
  ): Promise<void> {
    const document = editor.document;
    const edit = new vscode.WorkspaceEdit();
    const cursorPosition = editor.selection.active;
    const language = document.languageId;
    const docDir = path.dirname(document.uri.fsPath);
    const relativeSvg = this.relativeImport(docDir, svgFilePath);
    const relativeComponent = this.relativeImport(docDir, componentPath).replace(
      this.getExtension(framework),
      ''
    );

    if (['typescriptreact', 'javascriptreact', 'typescript', 'javascript'].includes(language)) {
      if (framework === 'vue') {
        const snippet = `<img src="/illustrations/${candidate.slug}.svg" alt="${candidate.title}" class="w-64 h-64 mx-auto" />\n`;
        edit.insert(document.uri, cursorPosition, snippet);
      } else {
        const fileContent = document.getText();
        if (!fileContent.includes(componentName)) {
          edit.insert(
            document.uri,
            new vscode.Position(0, 0),
            `import { ${componentName} } from '${relativeComponent}';\n`
          );
        }
        edit.insert(
          document.uri,
          cursorPosition,
          `<${componentName} className="w-64 h-64 mx-auto" />\n`
        );
      }
    } else if (language === 'vue') {
      this.insertAfterScriptOpen(document, edit, `import ${componentName} from '${relativeComponent}';`);
      edit.insert(document.uri, cursorPosition, `<${componentName} class="w-64 h-64 mx-auto" />\n`);
    } else if (language === 'svelte') {
      this.insertAfterScriptOpen(document, edit, `import ${componentName} from '${relativeComponent}';`);
      edit.insert(document.uri, cursorPosition, `<${componentName} class="w-64 h-64 mx-auto" />\n`);
    } else if (language === 'dart') {
      const fileContent = document.getText();
      if (!fileContent.includes(`import '${relativeComponent}.dart';`)) {
        edit.insert(
          document.uri,
          new vscode.Position(0, 0),
          `import '${relativeComponent}.dart';\n`
        );
      }
      edit.insert(document.uri, cursorPosition, `${componentName}(),\n`);
    } else if (language === 'html') {
      const snippet = `<img src="${relativeSvg}" alt="${candidate.title}" class="autopic-illustration" style="max-width: 480px; width: 100%; height: auto; display: block; margin: 1.5rem auto;" loading="lazy" />\n`;
      edit.insert(document.uri, cursorPosition, snippet);
    } else if (language === 'markdown') {
      edit.insert(document.uri, cursorPosition, `![${candidate.title}](${relativeSvg})\n`);
    } else {
      const snippet = `<img src="${relativeSvg}" alt="${candidate.title}" style="max-width: 480px; width: 100%; height: auto;" loading="lazy" />\n`;
      edit.insert(document.uri, cursorPosition, snippet);
    }

    await vscode.workspace.applyEdit(edit);
  }

  private static insertAfterScriptOpen(
    document: vscode.TextDocument,
    edit: vscode.WorkspaceEdit,
    importLine: string
  ): void {
    const text = document.getText();
    const match = text.match(/<script[^>]*>/i);
    if (!match || match.index === undefined) return;

    const insertAt = document.positionAt(match.index + match[0].length);
    edit.insert(document.uri, insertAt, `\n  ${importLine}`);
  }

  private static relativeImport(fromDir: string, targetPath: string): string {
    let relative = path.relative(fromDir, targetPath).replace(/\\/g, '/');
    if (!relative.startsWith('.')) relative = `./${relative}`;
    return relative;
  }

  private static escapeSingle(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}
