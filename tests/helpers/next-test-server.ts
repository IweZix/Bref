import { type ChildProcess, spawn } from 'node:child_process';

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess: ChildProcess | null = null;

export function getTestServerUrl(): string {
  return BASE_URL;
}

/** Spawns a real `next dev` on a dedicated port with the given env, for black-box tests. */
export async function startTestServer(
  env: Record<string, string>,
): Promise<void> {
  serverProcess = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: 'ignore',
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE_URL);
      if (response.status < 500) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Test Next.js server did not become ready in time');
}

export function stopTestServer(): void {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}
