import express, { type Request, type Response } from 'express';
import { spawn, execFileSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

interface CTask {
  id: number;
  name: string;
  priority: number;
  status: 'Pending' | 'Completed';
}

interface CQueueResponse {
  ok: boolean;
  message: string;
  maxCapacity: number;
  size: number;
  completedSize: number;
  nextId: number;
  nextPendingIndex: number;
  nextTask: CTask | null;
  affectedTask?: CTask;
  affectedIndex?: number;
  tasks: CTask[];
}

const ROOT_DIR = process.cwd();
const BINARY_PATH = path.resolve(ROOT_DIR, 'backend', 'task_manager');
const SOURCE_PATH = path.resolve(ROOT_DIR, 'backend', 'task_manager.c');

function ensureBinaryCompiled(): void {
  if (fs.existsSync(BINARY_PATH)) {
    return;
  }
  if (!fs.existsSync(SOURCE_PATH)) {
    throw new Error('Missing backend/task_manager.c source file.');
  }
  execFileSync('gcc', ['-O2', '-Wall', '-Wextra', SOURCE_PATH, '-o', BINARY_PATH], {
    cwd: ROOT_DIR,
    stdio: 'pipe',
  });
}

class CEngineBridge {
  private child: ChildProcessWithoutNullStreams | null = null;
  private rl: readline.Interface | null = null;
  private pendingResolvers: Array<{
    resolve: (val: CQueueResponse) => void;
    reject: (err: Error) => void;
  }> = [];
  private mutex: Promise<void> = Promise.resolve();

  private startProcess(): void {
    if (this.child && !this.child.killed && this.child.exitCode === null) {
      return;
    }

    ensureBinaryCompiled();

    const child = spawn(BINARY_PATH, ['--server'], {
      cwd: ROOT_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const rl = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });

    rl.on('line', (line: string) => {
      const next = this.pendingResolvers.shift();
      if (!next) return;
      try {
        const parsed = JSON.parse(line) as CQueueResponse;
        next.resolve(parsed);
      } catch (err) {
        next.reject(err instanceof Error ? err : new Error('Failed to parse C engine response'));
      }
    });

    child.on('exit', (code) => {
      while (this.pendingResolvers.length > 0) {
        const item = this.pendingResolvers.shift();
        item?.reject(new Error(`C engine exited unexpectedly with code ${code ?? 'null'}`));
      }
      this.child = null;
      this.rl = null;
    });

    child.on('error', (err) => {
      while (this.pendingResolvers.length > 0) {
        const item = this.pendingResolvers.shift();
        item?.reject(err);
      }
      this.child = null;
      this.rl = null;
    });

    this.child = child;
    this.rl = rl;
  }

  public execute(command: string): Promise<CQueueResponse> {
    const run = async (): Promise<CQueueResponse> => {
      this.startProcess();
      const child = this.child;
      if (!child) {
        throw new Error('Unable to start C priority queue engine.');
      }

      return new Promise<CQueueResponse>((resolve, reject) => {
        this.pendingResolvers.push({ resolve, reject });
        child.stdin.write(`${command}\n`, (err) => {
          if (err) {
            const idx = this.pendingResolvers.findIndex((p) => p.resolve === resolve);
            if (idx >= 0) {
              this.pendingResolvers.splice(idx, 1);
            }
            reject(err);
          }
        });
      });
    };

    const result = this.mutex.then(run, run);
    this.mutex = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  public shutdown(): void {
    this.rl?.close();
    this.child?.kill();
    this.child = null;
    this.rl = null;
  }
}

function sanitizeTaskName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\r\n\t|]+/g, ' ')
    .replace(/[\x00-\x1f]/g, '')
    .trim()
    .slice(0, 49);
}

function parsePositiveInt(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function parsePriority(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 10) return null;
  return n;
}

async function startServer(): Promise<void> {
  ensureBinaryCompiled();
  const engine = new CEngineBridge();
  const app = express();

  app.use(express.json({ limit: '16kb' }));

  app.get('/api/tasks', async (_req: Request, res: Response) => {
    try {
      const state = await engine.execute('LIST');
      res.json(state);
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Engine error' });
    }
  });

  app.post('/api/tasks', async (req: Request, res: Response) => {
    const cleanName = sanitizeTaskName(req.body?.name);
    const priority = parsePriority(req.body?.priority);

    if (!cleanName) {
      res.status(400).json({ ok: false, message: 'Task name cannot be empty.' });
      return;
    }
    if (priority === null) {
      res.status(400).json({ ok: false, message: 'Priority must be an integer between 1 and 10.' });
      return;
    }

    try {
      const state = await engine.execute(`INSERT ${priority}|${cleanName}`);
      res.status(state.ok ? 201 : 400).json(state);
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Engine error' });
    }
  });

  app.post('/api/tasks/process', async (_req: Request, res: Response) => {
    try {
      const state = await engine.execute('PROCESS');
      res.status(state.ok ? 200 : 400).json(state);
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Engine error' });
    }
  });

  app.post('/api/tasks/reset', async (_req: Request, res: Response) => {
    try {
      const state = await engine.execute('RESET');
      res.json(state);
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Engine error' });
    }
  });

  app.delete('/api/tasks/completed', async (_req: Request, res: Response) => {
    try {
      const state = await engine.execute('CLEAR_COMPLETED');
      res.json(state);
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Engine error' });
    }
  });

  app.patch('/api/tasks/:id/priority', async (req: Request, res: Response) => {
    const id = parsePositiveInt(req.params.id);
    const priority = parsePriority(req.body?.priority);

    if (id === null) {
      res.status(400).json({ ok: false, message: 'Invalid task ID.' });
      return;
    }
    if (priority === null) {
      res.status(400).json({ ok: false, message: 'Priority must be an integer between 1 and 10.' });
      return;
    }

    try {
      const state = await engine.execute(`UPDATE ${id} ${priority}`);
      res.status(state.ok ? 200 : 404).json(state);
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Engine error' });
    }
  });

  app.put('/api/tasks/:id', async (req: Request, res: Response) => {
    const id = parsePositiveInt(req.params.id);
    const cleanName = sanitizeTaskName(req.body?.name);
    const priority = parsePriority(req.body?.priority);

    if (id === null) {
      res.status(400).json({ ok: false, message: 'Invalid task ID.' });
      return;
    }
    if (!cleanName) {
      res.status(400).json({ ok: false, message: 'Task name cannot be empty.' });
      return;
    }
    if (priority === null) {
      res.status(400).json({ ok: false, message: 'Priority must be an integer between 1 and 10.' });
      return;
    }

    try {
      const state = await engine.execute(`EDIT ${id} ${priority}|${cleanName}`);
      res.status(state.ok ? 200 : 404).json(state);
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Engine error' });
    }
  });

  app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
    const id = parsePositiveInt(req.params.id);
    if (id === null) {
      res.status(400).json({ ok: false, message: 'Invalid task ID.' });
      return;
    }

    try {
      const state = await engine.execute(`DELETE ${id}`);
      res.status(state.ok ? 200 : 404).json(state);
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Engine error' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Priority Queue Task Manager listening on http://0.0.0.0:${port}`);
  });

  const cleanup = () => {
    engine.shutdown();
    server.close();
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
