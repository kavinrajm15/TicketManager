export default function Badge({ label, className = '', dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  );
}

// Status badge with preset color mapping
export function StatusBadge({ status }) {
  const map = {
    'todo':        { label: 'Todo',        cls: 'status-todo' },
    'in-progress': { label: 'In Progress', cls: 'status-inprogress' },
    'in-review':   { label: 'Review',      cls: 'status-inreview' },
    'done':        { label: 'Done',        cls: 'status-done' },
  };
  const s = map[status] || { label: status, cls: 'status-todo' };
  return <Badge label={s.label} className={`${s.cls} px-2.5 py-0.5`} />;
}

// Priority badge
export function PriorityBadge({ priority }) {
  const map = {
    low:    { label: 'Low',     icon: '▽', cls: 'bg-green-50 text-green-600' },
    medium: { label: 'Medium',  icon: '△', cls: 'bg-blue-50 text-blue-600' },
    high:   { label: 'High',    icon: '▲', cls: 'bg-red-50 text-red-600' },
  };
  const p = map[priority] || map.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${p.cls}`}>
      <span className="text-[10px]">{p.icon}</span>
      {p.label}
    </span>
  );
}

// Role badge
export function RoleBadge({ role }) {
  const map = {
    superadmin: 'bg-purple-100 text-purple-700',
    manager:    'bg-blue-100 text-blue-700',
    teamlead:   'bg-amber-100 text-amber-700',
    member:     'bg-gray-100 text-gray-600',
  };
  const labels = {
    superadmin: 'Super Admin', manager: 'Manager', teamlead: 'Team Lead', member: 'Member',
  };
  return (
    <Badge
      label={labels[role] || role}
      className={`${map[role] || 'bg-gray-100 text-gray-600'}`}
    />
  );
}
