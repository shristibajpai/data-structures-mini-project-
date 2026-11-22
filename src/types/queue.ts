export type TaskStatus = 'Pending' | 'Completed';

export interface Task {
  id: number;
  name: string;
  priority: number;
  status: TaskStatus;
}

export interface QueueState {
  ok: boolean;
  message: string;
  maxCapacity: number;
  size: number;
  completedSize: number;
  nextId: number;
  nextPendingIndex: number;
  nextTask: Task | null;
  affectedTask?: Task;
  affectedIndex?: number;
  tasks: Task[];
}

export type WorkspaceView = 'active' | 'completed' | 'all' | 'inspector';

export type PriorityTierFilter = 'all' | 'critical' | 'medium' | 'low';

export type SortMode = 'array' | 'priority-desc' | 'id-asc';

export interface OperationLogEntry {
  id: string;
  timestamp: string;
  command: string;
  ok: boolean;
  message: string;
  affectedTask?: Task;
  affectedIndex?: number;
}
