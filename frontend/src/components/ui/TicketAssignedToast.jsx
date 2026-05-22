import toast from 'react-hot-toast';


export function showTicketAssignedToast(notif) {
  toast.custom(
    (t) => (
      <div
        className={`
          relative overflow-hidden flex items-start gap-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100
          px-4 py-3.5 transition-all duration-300
          ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
        style={{ pointerEvents: 'all' }}
      >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-0.5">
            New Ticket Assigned
          </p>
          <p className="text-sm font-semibold text-textMain leading-snug truncate">
            {notif.message || 'You have been assigned a ticket'}
          </p>
          {notif.link && (
            <button
              className="mt-1.5 text-xs font-semibold text-primary hover:underline"
              onClick={() => {
                window.location.href = notif.link;
                toast.dismiss(t.id);
              }}
            >
              View Ticket →
            </button>
          )}
        </div>

        {/* Close */}
        <button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-textMuted hover:bg-gray-100 hover:text-textMain transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-primary rounded-b-2xl"
          style={{
            animation: 'shrink-bar 8s linear forwards',
            width: '100%',
          }}
        />

        <style>{`
          @keyframes shrink-bar {
            from { width: 100%; }
            to   { width: 0%; }
          }
        `}</style>
      </div>
    ),
    {
      duration: 8000,       // 8 seconds — noticeably longer than default
      position: 'bottom-right',
      id: `ticket-assigned-${notif._id || Date.now()}`,
    }
  );
}
