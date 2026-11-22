import { Minus, Plus } from 'lucide-react';
import { useState, type FormEvent, type RefObject } from 'react';
import { describePriority } from '../utils/priority';

interface InsertTaskBarProps {
  inputRef: RefObject<HTMLInputElement | null>;
  busy: boolean;
  isFull: boolean;
  maxCapacity: number;
  onInsert: (name: string, priority: number) => Promise<boolean>;
}

export function InsertTaskBar({
  inputRef,
  busy,
  isFull,
  maxCapacity,
  onInsert,
}: InsertTaskBarProps) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(5);
  const [validationError, setValidationError] = useState<string | null>(null);

  const tier = describePriority(priority);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setValidationError('Task name cannot be empty.');
      inputRef.current?.focus();
      return;
    }
    if (priority < 1 || priority > 10) {
      setValidationError('Priority must be between 1 and 10.');
      return;
    }

    setValidationError(null);
    const ok = await onInsert(trimmed, priority);
    if (ok) {
      setName('');
    }
  };

  return (
    <section
      aria-label="Insert new task"
      className="bg-white border border-slate-200 rounded-xl p-5"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="new-task-name"
                className="text-xs font-medium text-slate-700"
              >
                Task Name
              </label>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {name.length} / 49
              </span>
            </div>
            <input
              ref={inputRef}
              id="new-task-name"
              type="text"
              value={name}
              maxLength={49}
              disabled={busy || isFull}
              onChange={(e) => {
                setName(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={
                isFull
                  ? `Priority queue reached ${maxCapacity}-task limit`
                  : 'Enter task description (e.g., Audit TLS ingress certificates)'
              }
              className="w-full h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-end gap-4 shrink-0">
            <div>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <label
                  htmlFor="new-task-priority"
                  className="text-xs font-medium text-slate-700"
                >
                  Priority (1–10)
                </label>
                <span className={`text-xs font-medium ${tier.textClass}`}>
                  {tier.label}
                </span>
              </div>
              <div className="inline-flex items-center h-10 rounded-lg border border-slate-300 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPriority((p) => Math.max(1, p - 1))}
                  disabled={busy || isFull || priority <= 1}
                  aria-label="Decrease priority"
                  className="h-10 w-10 inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  id="new-task-priority"
                  type="number"
                  min={1}
                  max={10}
                  value={priority}
                  disabled={busy || isFull}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v)) {
                      setPriority(Math.min(10, Math.max(1, Math.round(v))));
                    }
                  }}
                  className="w-12 h-full text-center font-mono text-sm font-semibold text-slate-900 tabular-nums border-x border-slate-200 focus:outline-none focus:bg-blue-50/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setPriority((p) => Math.min(10, p + 1))}
                  disabled={busy || isFull || priority >= 10}
                  aria-label="Increase priority"
                  className="h-10 w-10 inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || isFull}
              className="h-10 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-sm font-medium transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
            >
              Insert Task
            </button>
          </div>
        </div>

        {validationError && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {validationError}
          </p>
        )}
      </form>
    </section>
  );
}
