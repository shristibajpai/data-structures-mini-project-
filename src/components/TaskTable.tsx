import {
  Check,
  CheckCircle2,
  Clock,
  Minus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState, type RefObject } from 'react';
import type {
  PriorityTierFilter,
  QueueState,
  SortMode,
  Task,
  WorkspaceView,
} from '../types/queue';
import { describePriority } from '../utils/priority';

interface TaskTableProps {
  state: QueueState | null;
  loading: boolean;
  busy: boolean;
  activeView: WorkspaceView;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onUpdatePriority: (id: number, priority: number) => Promise<boolean>;
  onEditTask: (id: number, name: string, priority: number) => Promise<boolean>;
  onDeleteTask: (id: number) => Promise<boolean>;
  onResetDefaults: () => void;
  onFocusInsert: () => void;
}

interface IndexedTask {
  task: Task;
  arrayLabel: string;
  isNextToProcess: boolean;
  rawIndex: number;
}

export function TaskTable({
  state,
  loading,
  busy,
  activeView,
  searchInputRef,
  onUpdatePriority,
  onEditTask,
  onDeleteTask,
  onResetDefaults,
  onFocusInsert,
}: TaskTableProps) {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<PriorityTierFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('priority-desc');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPriority, setEditPriority] = useState(5);

  const indexedTasks = useMemo<IndexedTask[]>(() => {
    if (!state) return [];
    const pendingSize = state.size;
    return state.tasks.map((task, idx) => {
      if (task.status === 'Pending') {
        return {
          task,
          arrayLabel: `pq[${idx}]`,
          isNextToProcess: idx === state.nextPendingIndex,
          rawIndex: idx,
        };
      }
      const completedIdx = idx - pendingSize;
      return {
        task,
        arrayLabel: `done[${completedIdx}]`,
        isNextToProcess: false,
        rawIndex: idx,
      };
    });
  }, [state]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    const byView = indexedTasks.filter(({ task }) => {
      if (activeView === 'active') return task.status === 'Pending';
      if (activeView === 'completed') return task.status === 'Completed';
      return true;
    });

    const byTier = byView.filter(({ task }) => {
      if (tierFilter === 'critical') return task.priority >= 8;
      if (tierFilter === 'medium') return task.priority >= 4 && task.priority <= 7;
      if (tierFilter === 'low') return task.priority <= 3;
      return true;
    });

    const byQuery = query
      ? byTier.filter(
          ({ task }) =>
            task.name.toLowerCase().includes(query) ||
            String(task.id).includes(query) ||
            `#${task.id}`.includes(query),
        )
      : byTier;

    const sorted = [...byQuery];
    if (sortMode === 'priority-desc') {
      sorted.sort((a, b) => {
        if (a.task.status !== b.task.status) {
          return a.task.status === 'Pending' ? -1 : 1;
        }
        if (b.task.priority !== a.task.priority) {
          return b.task.priority - a.task.priority;
        }
        return a.rawIndex - b.rawIndex;
      });
    } else if (sortMode === 'id-asc') {
      sorted.sort((a, b) => a.task.id - b.task.id);
    }
    return sorted;
  }, [indexedTasks, activeView, tierFilter, search, sortMode]);

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditName(task.name);
    setEditPriority(task.priority);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (id: number) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const ok = await onEditTask(id, trimmed, editPriority);
    if (ok) {
      setEditingId(null);
    }
  };

  const viewTitle =
    activeView === 'active'
      ? 'Pending Priority Queue'
      : activeView === 'completed'
        ? 'Completed Task Log'
        : 'All Queue Records';

  const hasActiveFilters = search.trim() !== '' || tierFilter !== 'all';

  return (
    <section
      aria-label={viewTitle}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h3 className="font-display text-base font-semibold text-slate-900">
            {viewTitle}
          </h3>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[210px] flex-1 sm:flex-initial">
            <Search
              className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or #ID"
              aria-label="Search tasks by name or ID"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div
            role="group"
            aria-label="Filter by priority tier"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'critical', label: 'Critical 8–10' },
                { id: 'medium', label: 'Medium 4–7' },
                { id: 'low', label: 'Low 1–3' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTierFilter(opt.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  tierFilter === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Sort task order"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
          >
            {(
              [
                { id: 'priority-desc', label: 'Priority Order' },
                { id: 'array', label: 'Array Slot pq[i]' },
                { id: 'id-asc', label: 'ID Order' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortMode(opt.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  sortMode === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && !state ? (
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 h-11 flex items-center gap-4 animate-pulse">
              <div className="h-4 w-8 bg-slate-200 rounded" />
              <div className="h-4 w-14 bg-slate-100 rounded" />
              <div className="h-4 flex-1 max-w-sm bg-slate-200 rounded" />
              <div className="h-4 w-28 bg-slate-100 rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="px-6 py-12 text-center space-y-3">
          <p className="text-sm font-medium text-slate-900">
            {hasActiveFilters
              ? 'No tasks match your active search or priority filter.'
              : activeView === 'completed'
                ? 'No tasks have been processed yet.'
                : 'No pending tasks in the priority queue.'}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Clear the search query or switch the priority tier filter to view all queued entries.'
              : activeView === 'completed'
                ? 'Process the highest-priority task from the active queue to record completed entries here.'
                : 'Add a task using the insert bar above or restore the default sample dataset.'}
          </p>
          <div className="pt-1 flex items-center justify-center gap-3">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setTierFilter('all');
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap"
              >
                Clear Filters
              </button>
            ) : activeView === 'active' ? (
              <>
                <button
                  type="button"
                  onClick={onFocusInsert}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium whitespace-nowrap"
                >
                  Insert First Task
                </button>
                <button
                  type="button"
                  onClick={onResetDefaults}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap"
                >
                  Restore Sample Tasks
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th scope="col" className="py-2.5 pl-5 pr-3 w-16 whitespace-nowrap">
                  ID
                </th>
                <th scope="col" className="py-2.5 px-3 w-24 whitespace-nowrap">
                  Slot
                </th>
                <th scope="col" className="py-2.5 px-3 min-w-[220px]">
                  Task Name
                </th>
                <th scope="col" className="py-2.5 px-3 w-56 whitespace-nowrap">
                  Priority
                </th>
                <th scope="col" className="py-2.5 px-3 w-28 whitespace-nowrap">
                  Status
                </th>
                <th
                  scope="col"
                  className="py-2.5 pl-3 pr-5 w-28 text-right whitespace-nowrap"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredTasks.map(({ task, arrayLabel, isNextToProcess }) => {
                const isEditing = editingId === task.id;
                const tier = describePriority(task.priority);

                return (
                  <tr
                    key={`${task.status}-${task.id}`}
                    className={`transition-colors duration-100 ${
                      isNextToProcess
                        ? 'bg-blue-50/40 hover:bg-blue-50/70'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 pl-5 pr-3 font-mono text-xs font-medium text-slate-500 tabular-nums whitespace-nowrap">
                      #{task.id}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      <span>{arrayLabel}</span>
                      {isNextToProcess && (
                        <span className="ml-1.5 font-sans font-semibold text-blue-600">
                          · Next
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          maxLength={49}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              void saveEdit(task.id);
                            } else if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                          aria-label={`Edit name for task #${task.id}`}
                          autoFocus
                          className="w-full h-9 px-2.5 rounded-md border border-blue-500 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      ) : (
                        <span
                          className={
                            task.status === 'Completed'
                              ? 'text-slate-500 line-through'
                              : 'font-medium text-slate-900'
                          }
                        >
                          {task.name}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isEditing ? (
                        <div className="inline-flex items-center h-9 rounded-md border border-slate-300 bg-white">
                          <button
                            type="button"
                            onClick={() => setEditPriority((p) => Math.max(1, p - 1))}
                            disabled={editPriority <= 1}
                            aria-label="Decrease edited priority"
                            className="h-9 w-8 inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono text-xs font-semibold tabular-nums">
                            {editPriority}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditPriority((p) => Math.min(10, p + 1))}
                            disabled={editPriority >= 10}
                            aria-label="Increase edited priority"
                            className="h-9 w-8 inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                void onUpdatePriority(task.id, Math.max(1, task.priority - 1))
                              }
                              disabled={busy || task.priority <= 1}
                              aria-label={`Decrease priority for task #${task.id}`}
                              title="Decrease priority"
                              className="h-7 w-7 inline-flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-35 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-7 text-center font-mono text-xs font-semibold text-slate-900 tabular-nums">
                              {task.priority}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void onUpdatePriority(task.id, Math.min(10, task.priority + 1))
                              }
                              disabled={busy || task.priority >= 10}
                              aria-label={`Increase priority for task #${task.id}`}
                              title="Increase priority"
                              className="h-7 w-7 inline-flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-35 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 min-w-[84px]">
                            <div
                              className="w-10 h-1.5 rounded-full bg-slate-100 overflow-hidden"
                              aria-hidden="true"
                            >
                              <div
                                className={`h-full ${tier.barClass}`}
                                style={{ width: `${task.priority * 10}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${tier.textClass}`}>
                              {tier.label}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {task.status === 'Pending' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <Clock className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                          <span>Pending</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
                          <span>Completed</span>
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 pl-3 pr-5 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void saveEdit(task.id)}
                            disabled={busy || !editName.trim()}
                            aria-label={`Save changes for task #${task.id}`}
                            title="Save"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            aria-label="Cancel editing"
                            title="Cancel"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(task)}
                            disabled={busy}
                            aria-label={`Edit task #${task.id}`}
                            title="Edit task"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDeleteTask(task.id)}
                            disabled={busy}
                            aria-label={`Delete task #${task.id}`}
                            title="Delete task"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
