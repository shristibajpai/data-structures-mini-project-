import type { OperationLogEntry, QueueState } from '../types/queue';
import { describePriority } from '../utils/priority';

interface ArrayInspectorProps {
  state: QueueState | null;
  history: OperationLogEntry[];
}

export function ArrayInspector({ state, history }: ArrayInspectorProps) {
  if (!state) {
    return (
      <section className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
        Loading queue memory layout...
      </section>
    );
  }

  const pendingTasks = state.tasks.slice(0, state.size);
  const completedTasks = state.tasks.slice(state.size);

  return (
    <div className="space-y-6">
      <section
        aria-label="C Priority Queue Array Layout"
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Linear Priority Queue Memory Layout
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live snapshot of <span className="font-mono">struct Task pq[{state.maxCapacity}]</span> and{' '}
              <span className="font-mono">completed[{state.maxCapacity}]</span> persisted by the C binary.
            </p>
          </div>
          <div className="font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
            size = {state.size} · completed_size = {state.completedSize} · next_id = {state.nextId}
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>Pending Queue Slots (pq[0] .. pq[{Math.max(0, state.size - 1)}])</span>
            {state.nextPendingIndex >= 0 && (
              <span className="font-mono text-blue-600 tabular-nums">
                find_highest_index() -&gt; {state.nextPendingIndex}
              </span>
            )}
          </div>

          {pendingTasks.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-500">
              pq[] has 0 active elements (size == 0).
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {pendingTasks.map((task, idx) => {
                const isHighest = idx === state.nextPendingIndex;
                const tier = describePriority(task.priority);
                return (
                  <div
                    key={task.id}
                    className={`rounded-lg border p-3.5 space-y-1.5 ${
                      isHighest
                        ? 'border-blue-600 bg-blue-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className={isHighest ? 'font-semibold text-blue-700' : 'text-slate-500'}>
                        pq[{idx}] {isHighest ? '· Next Dequeue' : ''}
                      </span>
                      <span className="text-slate-500">id={task.id}</span>
                    </div>
                    <div className="text-sm font-medium text-slate-900 truncate" title={task.name}>
                      {task.name}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold tabular-nums ${tier.textClass}`}>
                        priority={task.priority} ({tier.label})
                      </span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {task.name.length}/49 chars
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2.5 pt-2 border-t border-slate-200">
          <div className="text-xs font-medium text-slate-600">
            Completed Archive Slots ({completedTasks.length})
          </div>

          {completedTasks.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-lg p-5 text-center text-xs text-slate-500">
              completed[] has 0 archived elements (completed_size == 0).
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {completedTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500 tabular-nums">
                    <span>completed[{idx}]</span>
                    <span>id={task.id}</span>
                  </div>
                  <div className="text-sm text-slate-600 line-through truncate" title={task.name}>
                    {task.name}
                  </div>
                  <div className="text-xs font-mono text-slate-500 tabular-nums">
                    priority={task.priority}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        aria-label="Session C Engine Command History"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-baseline justify-between">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Session Engine Operations
          </h3>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {history.length} recorded
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-6 text-xs text-slate-500">
            No operations recorded in this session yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-slate-400 tabular-nums shrink-0">
                    {entry.timestamp}
                  </span>
                  <code className="font-mono font-medium text-slate-900 truncate">
                    {entry.command}
                  </code>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={entry.ok ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                    {entry.message}
                  </span>
                  {typeof entry.affectedIndex === 'number' && entry.affectedIndex >= 0 && (
                    <span className="font-mono text-slate-500 tabular-nums">
                      · index {entry.affectedIndex}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
