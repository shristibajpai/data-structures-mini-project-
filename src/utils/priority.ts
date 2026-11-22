export interface PriorityDescriptor {
  label: 'Critical' | 'Medium' | 'Low';
  textClass: string;
  barClass: string;
}

export function describePriority(priority: number): PriorityDescriptor {
  if (priority >= 8) {
    return {
      label: 'Critical',
      textClass: 'text-red-600',
      barClass: 'bg-red-600',
    };
  }
  if (priority >= 4) {
    return {
      label: 'Medium',
      textClass: 'text-amber-700',
      barClass: 'bg-amber-600',
    };
  }
  return {
    label: 'Low',
    textClass: 'text-slate-600',
    barClass: 'bg-slate-400',
  };
}
