import TicketCard from './TicketCard';
import useTicketStore from '../../store/useTicketStore';

const COLUMNS = [
  { key: 'todo',        label: 'Todo',        color: 'bg-gray-400' },
  { key: 'in-progress', label: 'In Progress', color: 'bg-amber-500' },
  { key: 'in-review',   label: 'Review',      color: 'bg-purple-500' },
  { key: 'done',        label: 'Done',        color: 'bg-emerald-500' },
];

function KanbanColumn({ column, tickets, onEdit, onDelete }) {
  const { moveTicket } = useTicketStore();

  const handleDrop = (e) => {
    e.preventDefault();
    const ticketNumber = e.dataTransfer.getData('ticketNumber');
    if (ticketNumber) moveTicket(ticketNumber, column.key);
    e.currentTarget.classList.remove('ring-2', 'ring-primary/40', 'bg-primary/5');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-primary/40', 'bg-primary/5');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('ring-2', 'ring-primary/40', 'bg-primary/5');
  };

  return (
    <div className="flex flex-col min-w-0 max-w-full overflow-hidden">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${column.color}`} />
        <span className="text-xs font-bold text-textMain uppercase tracking-wider truncate">{column.label}</span>
        <span className="ml-auto text-xs text-textMuted bg-gray-100 rounded-full px-2 py-0.5 font-semibold flex-shrink-0">
          {tickets.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className="flex-1 min-h-[120px] space-y-2.5 p-2 rounded-xl bg-gray-50/60 transition-all duration-150"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {tickets.map((ticket) => (
          <div
            key={ticket.ticketNumber}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('ticketNumber', ticket.ticketNumber);
              e.currentTarget.style.opacity = '0.5';
            }}
            onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <TicketCard ticket={ticket} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-textMuted/60 border-2 border-dashed border-gray-200 rounded-lg">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tickets, onEdit, onDelete }) {
  return (
    <div className="flex xl:grid xl:grid-cols-4 gap-4 overflow-x-auto pb-4 scrollbar-hide">
      {COLUMNS.map((col) => (
        <div key={col.key} className="flex-shrink-0 w-[260px] sm:w-[280px] xl:w-auto">
          <KanbanColumn
            column={col}
            tickets={tickets.filter((t) => t.status === col.key)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}
