import { AlertCircle, CheckCircle2, Menu, Play, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { queueClient } from './api/queueClient';
import { ArrayInspector } from './components/ArrayInspector';
import { InsertTaskBar } from './components/InsertTaskBar';
import { NextUpBanner } from './components/NextUpBanner';
import { Sidebar } from './components/Sidebar';
import { TaskTable } from './components/TaskTable';
import type { OperationLogEntry, QueueState, WorkspaceView } from './types/queue';

function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function App() {
  const [state, setState] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>('active');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [history, setHistory] = useState<OperationLogEntry[]>([]);

  const insertInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const appendLog = useCallback((command: string, result: QueueState) => {
    const entry: OperationLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: formatTimestamp(),
      command,
      ok: result.ok,
      message: result.message,
      affectedTask: result.affectedTask,
      affectedIndex: result.affectedIndex,
    };
    setHistory((prev) => [entry, ...prev].slice(0, 40));
  }, []);

  const loadInitialState = useCallback(async () => {
    setLoading(true);
    try {
      const data = await queueClient.listTasks();
      setState(data);
      appendLog('LIST', data);
      if (!data.ok && data.message) {
        setFeedback({ ok: false, text: data.message });
      }
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to reach task queue server.',
      });
    } finally {
      setLoading(false);
    }
  }, [appendLog]);

  useEffect(() => {
    void loadInitialState();
  }, [loadInitialState]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const runMutation = useCallback(
    async (commandLabel: string, action: () => Promise<QueueState>): Promise<boolean> => {
      setBusy(true);
      try {
        const res = await action();
        if (typeof res.size === 'number' && Array.isArray(res.tasks)) {
          setState(res);
        }
        appendLog(commandLabel, res);
        setFeedback({
          ok: res.ok,
          text:
            res.ok && res.affectedTask && commandLabel === 'PROCESS'
              ? `Processed Task #${res.affectedTask.id}: ${res.affectedTask.name}`
              : res.message,
        });
        return res.ok;
      } catch (err) {
        setFeedback({
          ok: false,
          text: err instanceof Error ? err.message : 'Operation failed.',
        });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [appendLog],
  );

  const handleInsert = useCallback(
    (name: string, priority: number) =>
      runMutation(`INSERT ${priority}|${name}`, () => queueClient.insertTask(name, priority)),
    [runMutation],
  );

  const handleProcessHighest = useCallback(
    () => void runMutation('PROCESS', () => queueClient.processHighest()),
    [runMutation],
  );

  const handleUpdatePriority = useCallback(
    (id: number, priority: number) =>
      runMutation(`UPDATE ${id} ${priority}`, () => queueClient.updatePriority(id, priority)),
    [runMutation],
  );

  const handleEditTask = useCallback(
    (id: number, name: string, priority: number) =>
      runMutation(`EDIT ${id} ${priority}|${name}`, () =>
        queueClient.editTask(id, name, priority),
      ),
    [runMutation],
  );

  const handleDeleteTask = useCallback(
    (id: number) => runMutation(`DELETE ${id}`, () => queueClient.deleteTask(id)),
    [runMutation],
  );

  const handleClearCompleted = useCallback(
    () => void runMutation('CLEAR_COMPLETED', () => queueClient.clearCompleted()),
    [runMutation],
  );

  const handleResetDefaults = useCallback(
    () => void runMutation('RESET', () => queueClient.resetDefaults()),
    [runMutation],
  );

  const viewBreadcrumb: Record<WorkspaceView, string> = {
    active: 'Active Queue',
    completed: 'Completed Log',
    all: 'All Tasks',
    inspector: 'Array Inspector',
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        state={state}
        busy={busy}
        onResetDefaults={handleResetDefaults}
        onClearCompleted={handleClearCompleted}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 whitespace-nowrap shrink-0">
                Task Manager
              </span>
              <span aria-hidden="true" className="text-slate-300 shrink-0">
                /
              </span>
              <h1 className="font-display font-semibold text-slate-900 truncate">
                {viewBreadcrumb[activeView]}
              </h1>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleProcessHighest}
              disabled={busy || !state?.nextTask}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0"
            >
              <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Process Highest</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-[1180px] mx-auto space-y-6">
            {feedback && (
              <div
                role="status"
                aria-live="polite"
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
                  feedback.ok
                    ? 'bg-white border-green-200 text-green-800'
                    : 'bg-white border-red-200 text-red-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {feedback.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" aria-hidden="true" />
                  )}
                  <span className="font-medium truncate">{feedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  aria-label="Dismiss notification"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <NextUpBanner
              state={state}
              loading={loading}
              busy={busy}
              onProcessHighest={handleProcessHighest}
              onResetDefaults={handleResetDefaults}
            />

            {activeView !== 'completed' && (
              <InsertTaskBar
                inputRef={insertInputRef}
                busy={busy}
                isFull={(state?.size ?? 0) >= (state?.maxCapacity ?? 100)}
                maxCapacity={state?.maxCapacity ?? 100}
                onInsert={handleInsert}
              />
            )}

            {activeView === 'inspector' ? (
              <ArrayInspector state={state} history={history} />
            ) : (
              <TaskTable
                state={state}
                loading={loading}
                busy={busy}
                activeView={activeView}
                searchInputRef={searchInputRef}
                onUpdatePriority={handleUpdatePriority}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onResetDefaults={handleResetDefaults}
                onFocusInsert={() => insertInputRef.current?.focus()}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
