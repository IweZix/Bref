import { type ChildProcess, spawn } from 'node:child_process';

let serverProcess: ChildProcess | null = null;
let serverPort: number | null = null;

export function getTestServerUrl(): string {
  if (!serverPort)
    throw new Error('Test server not started — call startTestServer() first');
  return `http://localhost:${serverPort}`;
}

/**
 * Spawns a real `next dev` on the given port with the given env, for black-box
 * tests. vitest.config.mts sets `fileParallelism: false` specifically so two
 * of these never run concurrently — they'd fight over the shared `.next`
 * build cache in this same project directory and neither would come up
 * cleanly. Each test file using this helper still gets its own port as
 * defense in depth (e.g. for isolated single-file runs).
 */
export async function startTestServer(
  port: number,
  env: Record<string, string>,
): Promise<void> {
  serverPort = port;
  const url = `http://localhost:${port}`;

  serverProcess = spawn('npx', ['next', 'dev', '-p', String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: 'ignore',
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
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
    serverPort = null;
  }
}
