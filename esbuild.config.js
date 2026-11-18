const esbuild = require('esbuild');
const path = require('path');

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: [path.join(__dirname, 'src/extension.ts')],
    bundle: true,
    format: 'cjs',
    minify: isProduction,
    sourcemap: !isProduction,
    sourcesContent: false,
    platform: 'node',
    outfile: path.join(__dirname, 'dist/extension.js'),
    external: ['vscode'],
    logLevel: 'info',
  });

  if (isWatch) {
    await ctx.watch();
    console.log('⚡ Watching extension host for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('✔ Extension host build complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
