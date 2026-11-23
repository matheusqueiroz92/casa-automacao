import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from 'dotenv';

const appDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = path.resolve(appDirectory, '..', '..');

config({ path: path.join(repositoryRoot, 'deploy', '.env') });

const expoCli = path.join(repositoryRoot, 'node_modules', 'expo', 'bin', 'cli');
const child = spawn(process.execPath, [expoCli, 'start', ...process.argv.slice(2)], {
  cwd: appDirectory,
  env: process.env,
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => child.kill(signal));
}

child.once('exit', (code) => process.exit(code ?? 1));
