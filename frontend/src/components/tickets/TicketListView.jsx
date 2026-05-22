import { useNavigate } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from '../ui/Badge';
import Avatar from '../ui/Avatar';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function TicketListView({ tickets, onEdit, onDelete }) {
  const navigate = useNavigate();

  if (!tickets.length) {
    return (
      <div className="text-center py-12 text-textMuted text-sm">
        No tickets found.
      </div>
    );
  }

   return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Header */}
          <div className="grid grid-cols-[minmax(0,2.5fr)_120px_120px_minmax(0,1.5fr)_100px_80px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
            {['Title', 'Status', 'Priority', 'Assignee', 'Created', ''].map((h) => (
              <span key={h} className="text-[10px] font-bold text-textMuted uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {tickets.map((ticket) => {
              const isOverdue = ticket.endDate && ticket.status !== 'done' && new Date(ticket.endDate) < new Date();
              return (
                <div
                  key={ticket.ticketNumber}
                  className={`
                    grid grid-cols-[minmax(0,2.5fr)_120px_120px_minmax(0,1.5fr)_100px_80px] gap-4 px-5 py-4 cursor-pointer transition-colors group items-center
                    ${isOverdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50/60'}
                  `}
                  style={isOverdue ? { boxShadow: 'inset 4px 0 0 0 #ef4444' } : {}}
                  onClick={() => {
                    if (ticket.project?.projectId) {
                      navigate(`/projects/${ticket.project.projectId}/tickets/${ticket.ticketNumber}`);
                    } else {
                      navigate(`/tickets/${ticket.ticketNumber}`);
                    }
                  }}
                >
                {/* Title */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-textMuted flex-shrink-0 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                      #{ticket.ticketNumber}
                    </span>
                    <span className="text-sm font-semibold text-textMain truncate">{ticket.title}</span>
                    {!ticket.project && (
                      <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold border border-indigo-100">
                        🌐 Global
                      </span>
                    )}
                    {ticket.endDate && ticket.status !== 'done' && (
                      <>
                        {new Date(ticket.endDate) < new Date() ? (
                          <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 bg-danger/10 text-danger rounded font-bold border border-danger/20">
                            Overdue
                          </span>
                        ) : new Date(ticket.endDate) < new Date(Date.now() + 24 * 60 * 60 * 1000) ? (
                          <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 bg-warning/10 text-warning-dark rounded font-bold border border-warning/20">
                            Due Soon
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                  {ticket.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ticket.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-textMuted rounded font-medium uppercase tracking-tighter">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center">
                  <StatusBadge status={ticket.status} />
                </div>

                {/* Priority */}
                <div className="flex items-center">
                  <PriorityBadge priority={ticket.priority} />
                </div>

                {/* Assignees */}
                <div className="min-w-0">
                  {ticket.assignees && ticket.assignees.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="flex -space-x-1.5 overflow-hidden flex-shrink-0">
                        {ticket.assignees.slice(0, 3).map((a) => (
                          <div key={a.userId} className="inline-block border-2 border-white rounded-full bg-white shadow-sm">
                            <Avatar user={a} size="xs" tooltip />
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-textMain font-medium truncate">
                        {ticket.assignees[0].name}
                        {ticket.assignees.length > 1 && ` +${ticket.assignees.length - 1}`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-textMuted/60 ml-2">—</span>
                  )}
                </div>

                {/* Created */}
                <div className="text-xs text-textMuted font-medium">{fmtDate(ticket.createdAt)}</div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity pr-2">
                  {onEdit && (
                    <button
                      id={`list-edit-${ticket.ticketNumber}`}
                      onClick={(e) => { e.stopPropagation(); onEdit(ticket); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-textMuted hover:bg-blue-50 hover:text-primary transition-all shadow-sm border border-transparent hover:border-blue-100"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
                      </svg>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      id={`list-delete-${ticket.ticketNumber}`}
                      onClick={(e) => { e.stopPropagation(); onDelete(ticket); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-textMuted hover:bg-red-50 hover:text-danger transition-all shadow-sm border border-transparent hover:border-red-100"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916"/>
                      </svg>
                    </button>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
