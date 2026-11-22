import { CheckSquare, Layers, ListTodo, RotateCcw, TerminalSquare, Trash2, X } from 'lucide-react';
import type { QueueState, WorkspaceView } from '../types/queue';

interface SidebarProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  state: QueueState | null;
  busy: boolean;
  onResetDefaults: () => void;
  onClearCompleted: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeView,
  onSelectView,
  state,
  busy,
  onResetDefaults,
  onClearCompleted,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pendingCount = state?.size ?? 0;
  const completedCount = state?.completedSize ?? 0;
  const totalCount = pendingCount + completedCount;
  const maxCapacity = state?.maxCapacity ?? 100;
  const capacityPct = Math.min(100, Math.round((pendingCount / maxCapacity) * 100));

  const navItems: Array<{
    id: WorkspaceView;
    label: string;
    count?: number;
    icon: typeof ListTodo;
  }> = [
    { id: 'active', label: 'Active Queue', count: pendingCount, icon: ListTodo },
    { id: 'completed', label: 'Completed Log', count: completedCount, icon: CheckSquare },
    { id: 'all', label: 'All Tasks', count: totalCount, icon: Layers },
    { id: 'inspector', label: 'Array Inspector', icon: TerminalSquare },
  ];

  const handleSelect = (view: WorkspaceView) => {
    onSelectView(view);
    onCloseMobile();
  };

  const content = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 px-4 py-5">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Priority Queue
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Queue workspace views" className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.count === 'number' && (
                  <span
                    className={`font-mono text-xs tabular-nums shrink-0 ${
                      isActive ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 pt-5 px-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">Queue Capacity</span>
            <span className="font-mono tabular-nums text-slate-900">
              {pendingCount} / {maxCapacity}
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"
            role="progressbar"
            aria-valuenow={pendingCount}
            aria-valuemin={0}
            aria-valuemax={maxCapacity}
            aria-label="Pending queue capacity"
          >
            <div
              className="h-full bg-blue-600 transition-transform duration-200 origin-left"
              style={{ width: `${capacityPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Next Assigned ID</span>
            <span className="font-mono tabular-nums text-slate-700">
              #{state?.nextId ?? 1}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-2">
        <button
          type="button"
          onClick={onClearCompleted}
          disabled={busy || completedCount === 0}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-45 disabled:pointer-events-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
        >
          <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Clear Completed</span>
        </button>

        <button
          type="button"
          onClick={onResetDefaults}
          disabled={busy}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-45 disabled:pointer-events-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap"
        >
          <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Restore Sample Tasks</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[260px] shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-[260px] max-w-[85vw] h-full z-10">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
