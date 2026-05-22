import { useNavigate } from "react-router-dom";
import { StatusBadge, PriorityBadge } from "../ui/Badge";
import Avatar from "../ui/Avatar";

export default function TicketCard({
  ticket,
  onEdit,
  onDelete,
  showProject = false,
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (ticket.project?.projectId) {
      navigate(
        `/projects/${ticket.project.projectId}/tickets/${ticket.ticketNumber}`,
      );
    } else {
      navigate(`/tickets/${ticket.ticketNumber}`);
    }
  };

  const isOverdue = ticket.endDate && ticket.status !== 'done' && new Date(ticket.endDate) < new Date();

  return (
    <div
      className={`
        w-full min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group
        ${isOverdue ? 'bg-red-100/40 border-red-300/50' : 'bg-white border-slate-100'}
      `}
      onClick={handleClick}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono text-textMuted">
          #{ticket.ticketNumber}
        </span>
        <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              id={`edit-ticket-${ticket.ticketNumber}`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(ticket);
              }}
              className="w-6 h-6 rounded flex items-center justify-center text-textMuted hover:bg-blue-50 hover:text-primary"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              id={`delete-ticket-${ticket.ticketNumber}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(ticket);
              }}
              className="w-6 h-6 rounded flex items-center justify-center text-textMuted hover:bg-red-50 hover:text-danger"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-textMain mb-2 leading-snug line-clamp-2">
        {ticket.title}
      </h3>

      {/* Due indicator */}
      {ticket.endDate && ticket.status !== 'done' && (
        <div className="mb-2 flex items-center gap-2">
          {new Date(ticket.endDate) < new Date() ? (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-danger/10 text-danger rounded font-bold border border-danger/20">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Overdue
            </span>
          ) : new Date(ticket.endDate) < new Date(Date.now() + 24 * 60 * 60 * 1000) ? (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-warning/10 text-warning-dark rounded font-bold border border-warning/20">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Due Soon
            </span>
          ) : null}
        </div>
      )}

      {/* Global / project label */}
      {showProject ? (
        ticket.project ? (
          <p className="text-xs text-textMuted mb-2">{ticket.project.name}</p>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-semibold border border-indigo-100 mb-2">
            🌐 Global
          </span>
        )
      ) : !ticket.project ? (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-semibold border border-indigo-100 mb-2">
          🌐 Global
        </span>
      ) : null}

      {/* Tags */}
      {ticket.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {ticket.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-textMuted rounded font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-y-2 mt-auto pt-2 border-t border-gray-50">
        <div className="flex items-center flex-wrap gap-1.5">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
        {ticket.assignees && ticket.assignees.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2 overflow-hidden">
              {ticket.assignees.slice(0, 3).map((a) => (
                <div
                  key={a.userId}
                  className="inline-block border-2 border-white rounded-full bg-white relative z-0 hover:z-10 transition-transform hover:scale-110"
                >
                  <Avatar user={a} size="xs" tooltip />
                </div>
              ))}
              {ticket.assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-medium text-textMuted relative z-0">
                  +{ticket.assignees.length - 3}
                </div>
              )}
            </div>
            <span className="text-[11px] font-medium text-textMain truncate max-w-[80px]">
              {ticket.assignees[0].name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-textMuted">Unassigned</span>
        )}
      </div>
    </div>
  );
}
