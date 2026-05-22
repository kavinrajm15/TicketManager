import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import useProjectStore from "../store/useProjectStore";
import useTicketStore from "../store/useTicketStore";
import useAuthStore from "../store/useAuthStore";
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import { RoleBadge } from "../components/ui/Badge";
import KanbanBoard from "../components/tickets/KanbanBoard";
import TicketListView from "../components/tickets/TicketListView";
import TicketForm from "../components/tickets/TicketForm";
import { PageLoader } from "../components/ui/Spinner";
import Swal from "sweetalert2";
import { projectAPI } from "../services/api";

// ── Status Overview Components ──────────────────────────────────────────────
const StatusStatCard = ({ label, value, color, bgColor, icon }) => (
  <div className={`rounded-2xl border p-4 flex items-center gap-3 ${bgColor}`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-textMain leading-none">{value}</p>
      <p className="text-xs font-semibold text-textMuted uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  </div>
);



export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentProject, loading: pLoad, fetchProject } = useProjectStore();
  const {
    tickets,
    viewMode,
    loading: tLoad,
    setViewMode,
    fetchProjectTickets,
    deleteTicket,
    totalTickets,
    totalPages,
  } = useTicketStore();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState("priority");

  const [showForm, setShowForm] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  // Status overview state (fetches all tickets for accurate counts)
  const [statusCounts, setStatusCounts] = useState({
    todo: 0, "in-progress": 0, "in-review": 0, done: 0, overdue: 0,
  });
  const [overviewLoading, setOverviewLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const p = await fetchProject(id);
      if (!p) {
        navigate("/projects");
        return;
      }
      fetchProjectTickets(id, { page, limit, status: statusFilter, sortBy });
    };
    loadData();
  }, [id, page, limit, statusFilter, sortBy]);

  // Fetch all tickets once for the status overview (independent of pagination)
  useEffect(() => {
    if (!id) return;
    setOverviewLoading(true);
    projectAPI.getTickets(id, { limit: 1000 })
      .then(({ data }) => {
        const now = new Date();
        const counts = { todo: 0, "in-progress": 0, "in-review": 0, done: 0, overdue: 0 };
        (data.tickets || []).forEach((t) => {
          if (counts[t.status] !== undefined) counts[t.status]++;
          if (t.endDate && new Date(t.endDate) < now && t.status !== "done") counts.overdue++;
        });
        setStatusCounts(counts);
      })
      .catch(() => {})
      .finally(() => setOverviewLoading(false));
  }, [id]);

  const isManager = ["superadmin", "manager"].includes(user?.role);

  const handleEdit = (ticket) => {
    setEditTicket(ticket);
    setShowForm(true);
  };
  const handleCloseForm = () => {
    setShowForm(false);
    setEditTicket(null);
  };

  const handleDelete = async (ticket) => {
    const res = await Swal.fire({
      title: `Delete Ticket #${ticket.ticketNumber}?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FF5630",
      cancelButtonColor: "#42526E",
      confirmButtonText: "Delete",
    });
    if (res.isConfirmed) deleteTicket(ticket.ticketNumber);
  };

  const filtered = statusFilter
    ? tickets.filter((t) => t.status === statusFilter)
    : tickets;

  if (pLoad && !currentProject) return <PageLoader />;

  return (
    <div className="space-y-6 ">
      {/* Sticky Top Bar: Back Button + Breadcrumb */}
      <div className="sticky top-16 -mx-6 -mt-6 px-6 py-4 bg-background/80 backdrop-blur-md z-20 border-b border-gray-100/50 mb-6">
        <div className="flex items-center gap-4 max-w-full">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-textMuted hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm group"
            title="Back"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-textMuted overflow-hidden">
            <button
              onClick={() => navigate("/projects")}
              className="hover:text-primary transition-colors whitespace-nowrap"
            >
              Projects
            </button>
            <span className="flex-shrink-0">/</span>
            <span className="text-textMain font-medium truncate">
              {currentProject?.name || "Loading…"}
            </span>
          </div>
        </div>
      </div>

      {/* Project header */}
      {currentProject && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {currentProject.key?.slice(0, 2) ||
                    currentProject.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-textMain">
                  {currentProject.name}
                </h2>
                <p className="text-sm text-textMuted mt-0.5">
                  {currentProject.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
              {/* Creator Info */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
                  Project Creator
                </span>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                  <Avatar user={currentProject.owner} size="xs" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-textMain">
                      {currentProject.owner?.name}
                    </span>
                    <div className="scale-75 origin-left">
                      <RoleBadge role={currentProject.owner?.role} />
                    </div>
                  </div>
                </div>
              </div>


              {/* Teams Info */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
                  Assigned Teams
                </span>
                {currentProject.teams && currentProject.teams.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {currentProject.teams.map((team) => (
                      <Link
                        key={team._id}
                        to={`/teams/${team._id}`}
                        className="flex items-center gap-2 bg-primary/5 hover:bg-primary/10 rounded-xl px-3 py-2 border border-primary/10 transition-all group"
                      >
                        <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {team.teamName?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-primary group-hover:underline truncate">
                          {team.teamName}
                        </span>
                        <svg className="w-3 h-3 text-primary flex-shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 italic text-xs text-textMuted">
                    No team assigned
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Ticket Status Overview ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-textMain">Ticket Status Overview</h3>
            <p className="text-xs text-textMuted mt-0.5">Distribution for this project</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-textMain">
              {statusCounts.todo + statusCounts["in-progress"] + statusCounts["in-review"] + statusCounts.done}
            </span>
            <span className="text-xs text-textMuted font-medium">total tickets</span>
          </div>
        </div>

        {overviewLoading ? (
          <div className="flex items-center justify-center h-24 text-textMuted text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatusStatCard
                label="Todo"
                value={statusCounts.todo}
                bgColor="bg-slate-50 border-slate-100"
                color="bg-slate-100 text-slate-600"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                }
              />
              <StatusStatCard
                label="In Progress"
                value={statusCounts["in-progress"]}
                bgColor="bg-amber-50 border-amber-100"
                color="bg-amber-100 text-amber-600"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatusStatCard
                label="In Review"
                value={statusCounts["in-review"]}
                bgColor="bg-purple-50 border-purple-100"
                color="bg-purple-100 text-purple-600"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
              <StatusStatCard
                label="Done"
                value={statusCounts.done}
                bgColor="bg-emerald-50 border-emerald-100"
                color="bg-emerald-100 text-emerald-600"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatusStatCard
                label="Overdue"
                value={statusCounts.overdue}
                bgColor="bg-rose-50 border-rose-100"
                color="bg-rose-100 text-rose-600"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                  </svg>
                }
              />
          </div>
        )}

        {/* Completion progress bar */}
        {(() => {
          const total = statusCounts.todo + statusCounts["in-progress"] + statusCounts["in-review"] + statusCounts.done;
          const pct = total ? Math.round((statusCounts.done / total) * 100) : 0;
          return (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-textMuted">Overall completion</span>
                <span className="text-xs font-bold text-textMain">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Tickets toolbar */}

      {/* Tickets toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h3 className="text-base font-bold text-textMain hidden sm:block">
            Tickets{" "}
            <span className="text-textMuted font-normal text-sm">
              ({totalTickets})
            </span>
          </h3>

          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
            {/* Status filter */}
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="">All Status</option>
              {["todo", "in-progress", "in-review", "done"].map((s) => (
                <option key={s} value={s}>
                  {s === "in-review" ? "Review" : s.replace("-", " ")}
                </option>
              ))}
            </select>

            {/* Sort selector */}
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="priority">Sort: Priority</option>
              <option value="createdAt">Sort: Newest</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
            {[
              { m: "list", icon: "☰" },
              { m: "kanban", icon: "⊞" },
            ].map(({ m, icon }) => (
              <button
                key={m}
                id={`view-${m}`}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === m
                    ? "bg-white shadow-sm text-textMain"
                    : "text-textMuted hover:text-textMain"
                }`}
              >
                {icon} <span className="hidden sm:inline">{m.charAt(0).toUpperCase() + m.slice(1)}</span>
              </button>
            ))}
          </div>

          <Button
            id="create-ticket-btn"
            size="sm"
            onClick={() => setShowForm(true)}
            icon={
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            }
          >
            New Ticket
          </Button>
        </div>
      </div>

      {/* Tickets view */}
      {tLoad && tickets.length === 0 ? (
        <PageLoader />
      ) : viewMode === "kanban" ? (
        <KanbanBoard
          tickets={filtered}
          onEdit={handleEdit}
          onDelete={isManager ? handleDelete : null}
        />
      ) : (
        <TicketListView
          tickets={filtered}
          onEdit={handleEdit}
          onDelete={isManager ? handleDelete : null}
        />
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-4">
        <div className="text-sm text-textMuted">
          Showing <span className="font-semibold text-textMain">{tickets.length}</span> of <span className="font-semibold text-textMain">{totalTickets}</span> tickets
        </div>

        <div className="flex items-center gap-4">
          {/* Limit selector */}
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

          {/* Navigation */}
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

      {/* Ticket form modal */}
      <TicketForm
        isOpen={showForm}
        onClose={handleCloseForm}
        ticket={editTicket}
        defaultProjectId={id}
        contextProjectId={id}
      />
    </div>
  );
}
