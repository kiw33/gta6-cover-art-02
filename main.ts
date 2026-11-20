// Vice Cover Studio — entry program (Node 22, standard library only).
//
// Hands the app in: copies app/ and screenshots/ from beside this file
// into the output directory and writes dossier.json with the vendored
// make.fun library, the summary the judge reads. Outside the grader's
// container, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (kit reference/gate.json): only text_max_bytes
// shapes the dossier's bytes; the rest refuse an entry the scorer would
// refuse outright — more than 4 screenshots or one over 256 KiB, more than
// 993 files in app/ or 48 MiB of app files in all, a path under app/ over
// 1000 bytes. app/ counts beside /output's own 1000-entry cap, which its
// screenshots/ and dossier.json share.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function freshDir(path: string): void {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function copyEntry(name: string): void {
  const source = join(repoRoot, name);
  if (!existsSync(source)) return;
  cpSync(source, join(outputDir, name), { recursive: true });
}

freshDir(outputDir);
copyEntry('app');
copyEntry('screenshots');

const dossierText = buildDossier(outputDir, DOSSIER_LIMITS);
writeFileSync(join(outputDir, 'dossier.json'), dossierText);

const dossierBytes = statSync(join(outputDir, 'dossier.json')).size;
console.log(`Wrote ${join(outputDir, 'dossier.json')} (${dossierBytes} bytes)`);
