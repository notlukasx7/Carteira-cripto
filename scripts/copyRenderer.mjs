import { mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, destPath);
    }
  }
}

const projectRoot = process.cwd();
const src = path.join(projectRoot, 'src', 'renderer');
const dest = path.join(projectRoot, 'dist', 'renderer');

try {
  const s = await stat(src);
  if (!s.isDirectory()) throw new Error('src/renderer não é um diretório');
  await copyDir(src, dest);
  console.log(`Renderer copiado: ${src} -> ${dest}`);
} catch (err) {
  console.error('Falha ao copiar renderer:', err?.message || err);
  process.exitCode = 1;
}

