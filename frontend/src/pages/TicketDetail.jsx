import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useTicketStore from "../store/useTicketStore";
import useAuthStore from "../store/useAuthStore";
import { ticketAPI } from "../services/api";
import { StatusBadge, PriorityBadge, RoleBadge } from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import TicketForm from "../components/tickets/TicketForm";
import TicketAttachments from "../components/tickets/TicketAttachments";
import CommentThread from "../components/comments/CommentThread";
import ForwardTicketModal from "../components/tickets/ForwardTicketModal";
import { PageLoader } from "../components/ui/Spinner";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

const BACKEND = "http://localhost:5000";

const STATUSES = ["todo", "in-progress", "in-review", "done"];
const PRIORITIES = ["low", "medium", "high"];
const STATUS_LABEL = {
  todo: "Todo",
  "in-progress": "In Progress",
  "in-review": "Review",
  done: "Done",
};


// ── Inline field updater ──────────────────────────────────────────────────
function InlineSelect({ label, value, options, labelMap, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-textMain hover:text-primary transition-colors group"
      >
        <span>{labelMap?.[value] ?? value}</span>
        <svg
          className="w-3.5 h-3.5 text-textMuted group-hover:text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 min-w-36 py-1 ">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left text-sm px-3 py-2 hover:bg-gray-50 transition-colors ${value === opt ? "font-semibold text-primary" : "text-textMain"}`}
            >
              {labelMap?.[opt] ?? opt}
              {value === opt && (
                <span className="float-right text-primary">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main TicketDetail page ────────────────────────────────────────────────

// ── Main TicketDetail page ────────────────────────────────────────────────
export default function TicketDetail() {
  const { ticketId, projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { updateTicket, deleteTicket } = useTicketStore();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const isManager = ["superadmin", "manager"].includes(user?.role);
  const isSuperAdmin = user?.role === "superadmin";

  const loadTicket = async () => {
    try {
      const { data } = await ticketAPI.getById(ticketId);
      setTicket(data.ticket);
    } catch (err) {
      const msg = err.response?.data?.message || "Ticket not found";
      toast.error(msg);
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  /* ── Inline field updates ── */
  const handleFieldChange = async (field, value) => {
    try {
      const { data } = await ticketAPI.update(ticketId, { [field]: value });
      setTicket(data.ticket);
      toast.success(
        `${field.charAt(0).toUpperCase() + field.slice(1)} updated`,
      );
    } catch {
      toast.error("Update failed");
    }
  };

  /* ── Attachment remove ── */
  const handleRemoveAttachment = async (attachmentId) => {
    try {
      await ticketAPI.removeAttachment(ticketId, attachmentId);
      setTicket((t) => ({
        ...t,
        attachments: t.attachments.filter((a) => a._id !== attachmentId),
      }));
      toast.success("Attachment removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  /* ── Delete ticket ── */
  const handleDelete = async () => {
    const res = await Swal.fire({
      title: "Delete this ticket?",
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FF5630",
      cancelButtonColor: "#42526E",
      confirmButtonText: "Delete",
    });
    if (!res.isConfirmed) return;
    await deleteTicket(ticket.ticketNumber);
    navigate(projectId ? `/projects/${projectId}` : "/tickets");
  };

  if (loading) return <PageLoader />;
  if (!ticket) return null;

  const reporter = ticket.reporter;
  const meta = [
    {
      label: "Reporter",
      content: reporter ? (
        <div className="flex items-center gap-2">
          <Avatar user={reporter} size="xs" />
          <div>
            <span className="text-sm text-textMain font-medium">
              {reporter.name}
            </span>
            <div className="mt-0.5">
              <RoleBadge role={reporter.role} />
            </div>
          </div>
        </div>
      ) : (
        <span className="text-sm text-textMuted">—</span>
      ),
    },
    {
      label: "Assignees",
      content:
        ticket.assignees && ticket.assignees.length > 0 ? (
          <div className="flex flex-col gap-2">
            {ticket.assignees.map((a) => (
              <div key={a.userId} className="flex items-center gap-2">
                <Avatar user={a} size="xs" />
                <span className="text-sm text-textMain">{a.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-textMuted">Unassigned</span>
        ),
    },
    {
      label: "Teams",
      content:
        ticket.teams && ticket.teams.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {ticket.teams.map((t) => (
              <span
                key={t._id}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100"
              >
                {t.teamName}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-textMuted">—</span>
        ),
    },
    {
      label: "Project",
      content: ticket.project ? (
        <span className="text-sm text-textMain">{ticket.project.name}</span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
          🌐 Global Ticket
        </span>
      ),
    },
    {
      label: "Start Date",
      content: (
        <span className="text-sm text-textMain font-medium">
          {ticket.startDate ? new Date(ticket.startDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      label: "End Date",
      content: (
        <span className="text-sm text-textMain font-medium">
          {ticket.endDate ? new Date(ticket.endDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      label: "Created",
      content: (
        <span className="text-sm text-textMuted">
          {new Date(ticket.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
  ];

  if ((ticket.tags || []).length > 0) {
    meta.push({
      label: "Tags",
      content: (
        <div className="flex flex-wrap gap-1.5">
          {ticket.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-xs font-medium text-textMuted rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      ),
    });
  }

  return (
    <div className="">
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
          <nav className="flex items-center gap-1.5 text-xs text-textMuted overflow-hidden">
            <button
              onClick={() =>
                navigate(projectId ? `/projects/${projectId}` : "/tickets")
              }
              className="hover:text-primary transition-colors font-medium whitespace-nowrap"
            >
              {projectId ? ticket.project?.name || "Project" : "All Tickets"}
            </button>
            <span className="flex-shrink-0">/</span>
            <span className="text-textMain font-semibold truncate">
              #{ticket.ticketNumber}
            </span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-textMain leading-snug">
            {ticket.title}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs font-mono text-textMuted bg-gray-100 px-2 py-0.5 rounded">
              #{ticket.ticketNumber}
            </span>
            {/* Inline status */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-textMuted">Status:</span>
              <InlineSelect
                value={ticket.status}
                options={STATUSES}
                labelMap={STATUS_LABEL}
                onChange={(v) => handleFieldChange("status", v)}
              />
            </div>
            {/* Inline priority */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-textMuted">Priority:</span>
              <InlineSelect
                value={ticket.priority}
                options={PRIORITIES}
                labelMap={null}
                onChange={(v) => handleFieldChange("priority", v)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {(isManager || ticket.assignees?.some(a => a.userId === user?.userId)) && (
            <Button
              id="forward-ticket-btn"
              variant="secondary"
              size="sm"
              onClick={() => setShowForward(true)}
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Forward
            </Button>
          )}
          <Button
            id="edit-ticket-btn"
            variant="secondary"
            size="sm"
            onClick={() => setShowEdit(true)}
          >
            <svg
              className="w-3.5 h-3.5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
              />
            </svg>
            Edit
          </Button>
          {isManager && (
            <Button
              id="delete-ticket-btn"
              variant="danger"
              size="sm"
              onClick={handleDelete}
            >
              <svg
                className="w-3.5 h-3.5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916"
                />
              </svg>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: description + attachments + comments OR Forward History */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center gap-6 border-b border-gray-100">
            <button
              onClick={() => setActiveTab("overview")}
              className={`text-sm font-semibold pb-2.5 border-b-2 transition-colors ${activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-textMuted hover:text-textMain"}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("forwards")}
              className={`text-sm font-semibold pb-2.5 border-b-2 transition-colors ${activeTab === "forwards" ? "border-primary text-primary" : "border-transparent text-textMuted hover:text-textMain"}`}
            >
              Forward History
            </button>
          </div>

          {activeTab === "overview" ? (
            <>
              {/* Description */}
              <Card className="p-5">
                <h3 className="text-sm font-bold text-textMain mb-3">
                  Description
                </h3>
                {ticket.description ? (
                  <p className="text-sm text-textMuted leading-relaxed whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                ) : (
                  <p className="text-sm text-textMuted italic">
                    No description provided.
                  </p>
                )}
              </Card>

              {/* Attachments */}
              <Card className="p-5">
                <TicketAttachments
                  attachments={ticket.attachments}
                  ticketNumber={ticket.ticketNumber}
                  onAdded={(updatedTicket) => setTicket(updatedTicket)}
                  onRemove={handleRemoveAttachment}
                  canRemove={isManager || ticket.reporter?.userId === user?.userId}
                />
              </Card>

              {/* Comments */}
              <CommentThread ticketId={ticket.ticketNumber} />
            </>
          ) : (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-textMain mb-4">Forwarding History</h3>
              {(!ticket.forwardHistory || ticket.forwardHistory.length === 0) ? (
                <p className="text-sm text-textMuted italic">This ticket has not been forwarded yet.</p>
              ) : (
                <div className="space-y-4">
                  {ticket.forwardHistory.slice().reverse().map((fh, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <Avatar user={fh.fromUser} size="md" className="flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-textMain">{fh.fromUser?.name}</p>
                          <span className="text-xs text-textMuted whitespace-nowrap">
                            {new Date(fh.forwardedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-textMain mb-1">
                          Forwarded to{' '}
                          <span className="font-semibold">
                            {[...(fh.toUsers || []).map(u => u.name), ...(fh.toTeams || []).map(t => t.teamName)].join(', ')}
                          </span>
                        </div>
                        {fh.previouslyAssignedTo && fh.previouslyAssignedTo.length > 0 && (
                          <div className="text-xs text-textMuted mb-2">
                            Previously assigned to: {fh.previouslyAssignedTo.map(u => u.name).join(', ')}
                          </div>
                        )}
                        {fh.message && (
                          <div className="text-sm text-textMuted italic bg-white p-3 rounded-lg border border-gray-200 mt-2">
                            "{fh.message}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right: metadata */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-textMain mb-4">Details</h3>
            <div className="space-y-4">
              {meta.map(({ label, content }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wider mb-1">
                    {label}
                  </p>
                  {content}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit form */}
      <TicketForm
        isOpen={showEdit}
        onClose={() => {
          setShowEdit(false);
          loadTicket();
        }}
        ticket={ticket}
        defaultProjectId={ticket.project?.projectId}
        contextProjectId={ticket.project?.projectId}
      />

      {/* Forward Ticket Modal */}
      <ForwardTicketModal
        isOpen={showForward}
        onClose={() => setShowForward(false)}
        ticket={ticket}
        onForwarded={(updatedTicket) => setTicket(updatedTicket)}
      />
    </div>
  );
}
