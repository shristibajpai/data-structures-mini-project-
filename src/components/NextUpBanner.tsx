import { Play, RotateCcw } from 'lucide-react';
import type { QueueState } from '../types/queue';
import { describePriority } from '../utils/priority';

interface NextUpBannerProps {
  state: QueueState | null;
  loading: boolean;
  busy: boolean;
  onProcessHighest: () => void;
  onResetDefaults: () => void;
}

export function NextUpBanner({
  state,
  loading,
  busy,
  onProcessHighest,
  onResetDefaults,
}: NextUpBannerProps) {
  const nextTask = state?.nextTask ?? null;
  const nextIndex = state?.nextPendingIndex ?? -1;
  const pendingCount = state?.size ?? 0;
  const completedCount = state?.completedSize ?? 0;
  const maxCapacity = state?.maxCapacity ?? 100;

  if (loading && !state) {
    return (
      <section
        aria-label="Next highest-priority task"
        className="bg-white border border-slate-200 rounded-xl p-6"
      >
        <div className="animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="h-4 w-36 bg-slate-200 rounded" />
            <div className="h-7 w-72 bg-slate-200 rounded" />
            <div className="h-4 w-52 bg-slate-100 rounded" />
          </div>
          <div className="h-10 w-44 bg-slate-200 rounded-lg shrink-0" />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Next highest-priority task"
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-medium text-slate-500">
            Next to Process · Highest Priority Candidate
          </p>

          {nextTask ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-sm font-medium text-slate-500 tabular-nums">
                  #{nextTask.id}
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight text-balance">
                  {nextTask.name}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-600">
                <span
                  className={`font-semibold tabular-nums ${describePriority(nextTask.priority).textClass}`}
                >
                  Priority {nextTask.priority} / 10 · {describePriority(nextTask.priority).label}
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  Array slot pq[{nextIndex}]
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-xs text-slate-500">
                  Selected by linear scan find_highest_index()
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <h2 className="font-display text-xl font-semibold text-slate-900">
                Priority Queue is empty
              </h2>
              <p className="text-sm text-slate-600">
                Insert a new task below or restore the default sample queue to begin processing.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6 shrink-0">
          <div className="grid grid-cols-3 divide-x divide-slate-200 border border-slate-200 rounded-lg bg-slate-50/60">
            <div className="px-4 py-2.5">
              <div className="text-xs text-slate-500 whitespace-nowrap">Pending</div>
              <div className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                {pendingCount}
                <span className="text-xs font-normal text-slate-400">/{maxCapacity}</span>
              </div>
            </div>
            <div className="px-4 py-2.5">
              <div className="text-xs text-slate-500 whitespace-nowrap">Peak Level</div>
              <div className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                {nextTask ? nextTask.priority : '—'}
              </div>
            </div>
            <div className="px-4 py-2.5">
              <div className="text-xs text-slate-500 whitespace-nowrap">Completed</div>
              <div className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                {completedCount}
              </div>
            </div>
          </div>

          {nextTask ? (
            <button
              type="button"
              onClick={onProcessHighest}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Process Task</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onResetDefaults}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Restore Sample Tasks</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
