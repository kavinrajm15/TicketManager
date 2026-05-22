import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTicketStore from '../store/useTicketStore';
import useAuthStore from '../store/useAuthStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import KanbanBoard from '../components/tickets/KanbanBoard';
import TicketListView from '../components/tickets/TicketListView';
import TicketForm from '../components/tickets/TicketForm';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import Swal from 'sweetalert2';

const STATUS_OPTS = ['todo','in-progress','in-review','done'];
const PRIORITY_OPTS = ['low','medium','high'];

export default function Tickets({ mode = 'all' }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
     tickets, 
     viewMode, 
     loading, 
     setViewMode, 
     fetchTickets,
     fetchMyTickets,
     deleteTicket,
     totalTickets,
     totalPages
  } = useTicketStore();
 
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("priority");
  const [showForm, setShowForm] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [priorityF, setPriorityF] = useState('');
 
  // Reset filters when switching between My Tickets / All Tickets
  useEffect(() => {
    setPage(1);
    setSearch('');
    setStatusF('');
    setPriorityF('');
  }, [mode]);

  useEffect(() => { 
    const params = { page, limit, status: statusF, priority: priorityF, sortBy };
    if (mode === 'mine') {
      fetchMyTickets(params);
    } else {
      fetchTickets(params);
    }
  }, [page, limit, statusF, priorityF, sortBy, mode]);
 
  const isManager = ['superadmin', 'manager'].includes(user?.role);
  const isSuperAdmin = user?.role === 'superadmin';
 
  const isTicketOverdue = (t) => t.endDate && t.status !== 'done' && new Date(t.endDate) < new Date();

  const filtered = tickets
    .filter((t) => {
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || String(t.ticketNumber).includes(search);
      const matchStatus = !statusF || t.status === statusF;
      const matchPriority = !priorityF || t.priority === priorityF;
      return matchSearch && matchStatus && matchPriority;
    })
    .sort((a, b) => {
      const aOverdue = isTicketOverdue(a) ? 0 : 1;
      const bOverdue = isTicketOverdue(b) ? 0 : 1;
      return aOverdue - bOverdue; // overdue (0) sorts before non-overdue (1)
    });
 
  const handleEdit = (t) => { setEditTicket(t); setShowForm(true); };
  const handleClose = () => { setShowForm(false); setEditTicket(null); };
 
  const handleDelete = async (ticket) => {
    const res = await Swal.fire({
      title: `Delete Ticket #${ticket.ticketNumber}?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF5630',
      cancelButtonColor: '#42526E',
      confirmButtonText: 'Delete',
    });
    if (res.isConfirmed) deleteTicket(ticket.ticketNumber);
  };

  const pageTitle = mode === 'mine' ? 'My Tickets' : 'All Tickets';
  const pageDescription = mode === 'mine'
    ? `${totalTickets} ticket${totalTickets !== 1 ? 's' : ''} assigned to you`
    : `${totalTickets} ticket${totalTickets !== 1 ? 's' : ''} total`;

  const emptyDescription = mode === 'mine'
    ? (search || statusF || priorityF ? 'Try adjusting your filters' : 'No tickets are assigned to you yet')
    : (search || statusF || priorityF ? 'Try adjusting your filters' : 'No tickets have been created yet');
 
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-textMain">{pageTitle}</h2>
          <p className="text-sm text-textMuted mt-0.5">{pageDescription}</p>
        </div>
        <Button
          id="create-ticket-global-btn"
          onClick={() => setShowForm(true)}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
          }
        >
          New Ticket
        </Button>
      </div>
 
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          {/* Search */}
          <div className="relative w-full md:flex-1 md:min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
            <input
              id="tickets-search"
              type="text"
              placeholder="Search by title or #number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
 
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            {/* Status filter */}
            <select
              id="tickets-status-filter"
              value={statusF}
              onChange={(e) => { setStatusF(e.target.value); setPage(1); }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="">All Status</option>
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{s.replace('-',' ')}</option>)}
            </select>
  
            {/* Priority filter */}
            <select
              id="tickets-priority-filter"
              value={priorityF}
              onChange={(e) => { setPriorityF(e.target.value); setPage(1); }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="">All Priority</option>
              {PRIORITY_OPTS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 w-full md:w-auto">
            {/* Sort selector */}
            <select
              id="tickets-sort-by"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="w-full md:w-auto text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white flex-1 md:flex-none"
            >
              <option value="priority">Sort: Priority</option>
              <option value="createdAt">Sort: Newest</option>
            </select>
  
            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
              {[{ m:'list', icon:'☰' }, { m:'kanban', icon:'⊞' }].map(({ m, icon }) => (
                <button
                  key={m}
                  id={`tickets-view-${m}`}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === m ? 'bg-white shadow-sm text-textMain' : 'text-textMuted hover:text-textMain'
                  }`}
                >
                  {icon} <span className="hidden sm:inline">{m.charAt(0).toUpperCase()+m.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
 
      {/* Tickets view */}
      {loading && tickets.length === 0 ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🎫"
          title="No tickets found"
          description={emptyDescription}
          action={<Button onClick={() => setShowForm(true)}>Create First Ticket</Button>}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanBoard tickets={filtered} onEdit={handleEdit} onDelete={isManager ? handleDelete : null} />
      ) : (
        <TicketListView tickets={filtered} onEdit={handleEdit} onDelete={isManager ? handleDelete : null} />
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-4">
        <div className="text-sm text-textMuted">
          Showing <span className="font-semibold text-textMain">{tickets.length}</span> of <span className="font-semibold text-textMain">{totalTickets}</span> tickets
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-textMuted uppercase tracking-wider">Per page</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="text-sm font-bold bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 px-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Button>
            
            <div className="min-w-[80px] text-center">
              <span className="text-sm font-bold text-textMain">Page {page}</span>
              <span className="text-xs text-textMuted block">of {totalPages}</span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-9 px-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
 
      <TicketForm isOpen={showForm} onClose={handleClose} ticket={editTicket} />
    </div>
  );
}
