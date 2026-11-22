import type { QueueState } from '../types/queue';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });

  const data = (await res.json()) as QueueState;
  if (!res.ok && !data.message) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return data as unknown as T;
}

export const queueClient = {
  listTasks(): Promise<QueueState> {
    return requestJson<QueueState>('/api/tasks');
  },

  insertTask(name: string, priority: number): Promise<QueueState> {
    return requestJson<QueueState>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ name, priority }),
    });
  },

  processHighest(): Promise<QueueState> {
    return requestJson<QueueState>('/api/tasks/process', {
      method: 'POST',
    });
  },

  updatePriority(id: number, priority: number): Promise<QueueState> {
    return requestJson<QueueState>(`/api/tasks/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
  },

  editTask(id: number, name: string, priority: number): Promise<QueueState> {
    return requestJson<QueueState>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, priority }),
    });
  },

  deleteTask(id: number): Promise<QueueState> {
    return requestJson<QueueState>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  clearCompleted(): Promise<QueueState> {
    return requestJson<QueueState>('/api/tasks/completed', {
      method: 'DELETE',
    });
  },

  resetDefaults(): Promise<QueueState> {
    return requestJson<QueueState>('/api/tasks/reset', {
      method: 'POST',
    });
  },
};
