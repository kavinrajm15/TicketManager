import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useTicketStore from "../store/useTicketStore";
import useProjectStore from "../store/useProjectStore";
import useAuthStore from "../store/useAuthStore";
import Card from "../components/ui/Card";
import { StatusBadge, PriorityBadge } from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import { PageLoader } from "../components/ui/Spinner";

const StatCard = ({ label, value, icon, color, trend }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="text-3xl font-bold text-textMain">{value}</p>
        {trend && (
          <p className="text-xs text-emerald-600 mt-1 font-medium">{trend}</p>
        )}
      </div>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
      >
        {icon}
      </div>
    </div>
  </Card>
);

// ── Stat icon definitions ───────────────────────────────────────────────────
const TicketIcon = () => (
  <svg
    className="w-5 h-5 text-blue-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"
    />
  </svg>
);
const ClockIcon = () => (
  <svg
    className="w-5 h-5 text-amber-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const CheckIcon = () => (
  <svg
    className="w-5 h-5 text-emerald-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const FireIcon = () => (
  <svg
    className="w-5 h-5 text-red-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);
const OverdueIcon = () => (
  <svg
    className="w-5 h-5 text-rose-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
    />
  </svg>
);

// Simple CSS-only bar chart for ticket status
function StatusChart({ tickets }) {
  const counts = {
    todo: 0,
    "in-progress": 0,
    "in-review": 0,
    done: 0,
  };
  const projectCounts = {
    todo: {},
    "in-progress": {},
    "in-review": {},
    done: {},
  };
  tickets.forEach((t) => {
    if (counts[t.status] !== undefined) {
      counts[t.status]++;
      const projName = t.project?.name || "Unknown Project";
      projectCounts[t.status][projName] =
        (projectCounts[t.status][projName] || 0) + 1;
    }
  });
  const max = Math.max(...Object.values(counts), 1);

  const bars = [
    { key: "todo", label: "Todo", color: "bg-gray-400" },
    { key: "in-progress", label: "In Progress", color: "bg-amber-500" },
    { key: "in-review", label: "Review", color: "bg-purple-500" },
    { key: "done", label: "Done", color: "bg-emerald-500" },
  ];

  return (
    <div className="flex items-end gap-3 h-32 mt-4">
      {bars.map((b) => (
        <div
          key={b.key}
          className="flex flex-col items-center gap-1 flex-1 relative group"
        >
          <span className="text-xs font-bold text-textMain">
            {counts[b.key]}
          </span>
          <div
            className={`w-full rounded-t-lg ${b.color} transition-all duration-700`}
            style={{
              height: `${(counts[b.key] / max) * 96}px`,
              minHeight: counts[b.key] > 0 ? "4px" : "0",
            }}
          />
          <span className="text-[9px] text-textMuted font-medium text-center">
            {b.label}
          </span>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-40 bg-gray-800 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-lg">
            <p className="font-bold border-b border-gray-600 pb-1 mb-1">
              {b.label}
            </p>
            {Object.keys(projectCounts[b.key]).length > 0 ? (
              Object.entries(projectCounts[b.key]).map(([proj, count]) => (
                <div
                  key={proj}
                  className="flex items-center justify-between py-0.5 gap-2"
                >
                  <span className="truncate text-[10px] text-gray-200">
                    {proj}
                  </span>
                  <span className="font-bold">{count}</span>
                </div>
              ))
            ) : (
              <span className="text-gray-400 italic text-[10px]">
                No tickets
              </span>
            )}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tickets, loading: tLoad, fetchTickets } = useTicketStore();
  const { projects, loading: pLoad, fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchTickets();
    fetchProjects();
  }, []);

  const now = new Date();
  const priorityMap = { high: 3, medium: 2, low: 1 };
  const isTicketOverdue = (t) =>
    t.endDate && t.status !== "done" && new Date(t.endDate) < now;

  const myTickets = tickets
    .filter((t) => t.assignees?.some((a) => a.userId === user?.userId))
    .sort((a, b) => {
      const aOverdue = isTicketOverdue(a);
      const bOverdue = isTicketOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      const aPrio = priorityMap[a.priority] || 0;
      const bPrio = priorityMap[b.priority] || 0;
      if (aPrio !== bPrio) return bPrio - aPrio;

      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  const inProgress = tickets.filter((t) => t.status === "in-progress");
  const done = tickets.filter((t) => t.status === "done");
  const highPriority = tickets.filter(
    (t) => t.priority === "high" && t.status !== "done",
  );
  const overdue = tickets.filter(
    (t) => t.endDate && new Date(t.endDate) < now && t.status !== "done",
  );

  if (tLoad && tickets.length === 0) return <PageLoader />;

  return (
    <div className="space-y-6 ">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-textMain">
          Good{" "}
          {new Date().getHours() < 12
            ? "morning"
            : new Date().getHours() < 18
              ? "afternoon"
              : "evening"}
          , {user?.name?.split(" ")[0]} 👋
        </h2>
        <p className="text-textMuted text-sm mt-1">
          Here's what's happening across your projects today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="My Tickets"
          value={myTickets.length}
          icon={<TicketIcon />}
          color="bg-blue-50"
          trend={`${myTickets.filter((t) => t.status === "todo").length} todo`}
        />
        <StatCard
          label="In Progress"
          value={inProgress.length}
          icon={<ClockIcon />}
          color="bg-amber-50"
        />
        <StatCard
          label="Completed"
          value={done.length}
          icon={<CheckIcon />}
          color="bg-emerald-50"
        />
        <StatCard
          label="High Priority"
          value={highPriority.length}
          icon={<FireIcon />}
          color="bg-red-50"
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          icon={<OverdueIcon />}
          color="bg-rose-50"
          trend={overdue.length > 0 ? "Needs attention" : "All on track"}
        />
      </div>

      {/* Chart + Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status chart */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-textMain">
            Ticket Status Overview
          </h3>
          <p className="text-xs text-textMuted mt-0.5">
            Distribution across all projects
          </p>
          <StatusChart tickets={tickets} />
        </Card>

        {/* My projects */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-textMain mb-3">My Projects</h3>
          <div className="space-y-2">
            {projects.slice(0, 4).map((p) => {
              const pTickets = tickets.filter(
                (t) => t.project?.projectId === p.projectId,
              );
              const doneCount = pTickets.filter(
                (t) => t.status === "done",
              ).length;
              const pct = pTickets.length
                ? Math.round((doneCount / pTickets.length) * 100)
                : 0;

              const statusCounts = {
                todo: 0,
                "in-progress": 0,
                "in-review": 0,
                done: 0,
              };
              pTickets.forEach((t) => {
                if (statusCounts[t.status] !== undefined)
                  statusCounts[t.status]++;
              });

              return (
                <div key={p.projectId} className="relative group">
                  <button
                    onClick={() => navigate(`/projects/${p.projectId}`)}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-textMain truncate">
                        {p.name}
                      </span>
                      <span className="text-xs text-textMuted">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>

                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-40 bg-gray-800 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-lg">
                    <p className="font-bold border-b border-gray-600 pb-1 mb-1 truncate">
                      {p.name} Tickets
                    </p>
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-300">Todo</span>
                      <span className="font-bold">{statusCounts["todo"]}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-300">In Progress</span>
                      <span className="font-bold">
                        {statusCounts["in-progress"]}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-300">Review</span>
                      <span className="font-bold">
                        {statusCounts["in-review"]}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-300">Done</span>
                      <span className="font-bold">{statusCounts["done"]}</span>
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800"></div>
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && (
              <p className="text-xs text-textMuted text-center py-4">
                No projects yet
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* My tickets */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-textMain">My Tickets</h3>
          <button
            onClick={() => navigate("/tickets")}
            className="text-xs text-primary hover:underline font-medium"
          >
            View all →
          </button>
        </div>
        {myTickets.length === 0 ? (
          <p className="text-xs text-textMuted text-center py-6">
            No tickets assigned to you yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {myTickets.slice(0, 6).map((ticket) => {
              const isOverdue = isTicketOverdue(ticket);
              return (
                <div
                  key={ticket.ticketNumber}
                  className={`flex items-center gap-4 py-3 rounded-lg px-2 cursor-pointer transition-colors ${
                    isOverdue
                      ? "bg-red-50 hover:bg-red-100"
                      : "hover:bg-gray-50/50"
                  }`}
                  style={
                    isOverdue ? { boxShadow: "inset 4px 0 0 0 #ef4444" } : {}
                  }
                  onClick={() =>
                    navigate(
                      `/projects/${ticket.project?.projectId}/tickets/${ticket.ticketNumber}`,
                    )
                  }
                >
                  <span className="text-xs font-mono text-textMuted w-12 sm:w-16 flex-shrink-0">
                    #{ticket.ticketNumber}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-textMain truncate">
                        {ticket.title}
                      </span>
                      {isOverdue && (
                        <span className="flex-shrink-0 text-[8px] px-1.5 py-0.5 bg-danger/10 text-danger rounded font-bold border border-danger/20 uppercase tracking-tighter">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>
                  <div className="sm:hidden">
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
