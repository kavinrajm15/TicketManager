import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTicketStore from '../../store/useTicketStore';
import useAuthStore from '../../store/useAuthStore';
import useProjectStore from '../../store/useProjectStore';
import { userAPI, ticketAPI, teamAPI } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import UserMentionSelect from '../ui/UserMentionSelect';
import TeamMentionSelect from '../ui/TeamMentionSelect';
import TicketAttachments from './TicketAttachments';
import toast from 'react-hot-toast';

const STATUSES   = ['todo','in-progress','in-review','done'];
const PRIORITIES = ['low','medium','high'];

const labelMap = {
  'todo':'Todo','in-progress':'In Progress',
  'in-review':'Review','done':'Done',
};

const FIELD = 'block w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-all';
const LABEL = 'block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1';

export default function TicketForm({ isOpen, onClose, ticket, defaultProjectId, contextProjectId }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const { createTicket, updateTicket } = useTicketStore();

  const isEdit = !!ticket;

  // Keep projectId as a string so <select> value always matches <option> values
  const defaultProjId = defaultProjectId ? String(defaultProjectId) : '';

  const initial = {
    title: '', description: '', status: 'todo', priority: 'low',
    projectId: defaultProjId, assigneeIds: [], teamIds: [], tags: '',
    startDate: '', endDate: '',
  };

  const [form, setForm]     = useState(initial);
  const [users, setUsers]   = useState([]);
  const [teams, setTeams]   = useState([]);
  const [saving, setSaving] = useState(false);
  const [localAttachments, setLocalAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingLinks, setPendingLinks] = useState([]);

  // ── Fetch users scoped to a project (or all if no project context) ──────
  const fetchUsersAndTeams = async (projId) => {
    try {
      const params = projId ? { projectId: projId } : {};
      const { data: userData } = await userAPI.getAll(params);
      setUsers(userData.users || []);

      const { data: teamData } = await teamAPI.getAll();
      setTeams(teamData.teams || []);
    } catch {
      setUsers([]);
      setTeams([]);
    }
  };

  // Populate form for edit
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      const scopedProjectId =
        contextProjectId ??
        (ticket?.project?.projectId != null ? ticket.project.projectId : null);
      fetchUsersAndTeams(scopedProjectId);
      setPendingFiles([]);
      setPendingLinks([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (ticket) {
      setForm({
        title:       ticket.title       || '',
        description: ticket.description || '',
        status:      ticket.status      || 'todo',
        priority:    ticket.priority    || 'low',
        // Normalize to string so <select> value matches <option value={p.projectId}>
        projectId:   ticket.project?.projectId != null
          ? String(ticket.project.projectId)
          : defaultProjId,
        assigneeIds: ticket.assignees ? ticket.assignees.map(a => String(a.userId)) : [],
        teamIds:     ticket.teams ? ticket.teams.map(t => String(t._id || t)) : [],
        tags:        (ticket.tags || []).join(', '),
        startDate:   ticket.startDate ? new Date(ticket.startDate).toISOString().split('T')[0] : '',
        endDate:     ticket.endDate   ? new Date(ticket.endDate).toISOString().split('T')[0] : '',
      });
      setLocalAttachments(ticket.attachments || []);
    } else {
      setForm({ ...initial, projectId: defaultProjId });
      setLocalAttachments([]);
    }
  }, [ticket, defaultProjectId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isChanged = () => {
    if (!isEdit) return true;
    
    const ticketProjId = ticket.project?.projectId != null ? String(ticket.project.projectId) : '';
    const ticketAssignees = ticket.assignees ? ticket.assignees.map(a => String(a.userId)) : [];
    const ticketTeams = ticket.teams ? ticket.teams.map(t => String(t._id || t)) : [];
    const ticketTags = (ticket.tags || []).join(', ');
    const ticketStart = ticket.startDate ? new Date(ticket.startDate).toISOString().split('T')[0] : '';
    const ticketEnd = ticket.endDate ? new Date(ticket.endDate).toISOString().split('T')[0] : '';

    const hasFieldChanges = 
      form.title !== (ticket.title || '') ||
      form.description !== (ticket.description || '') ||
      form.status !== (ticket.status || 'todo') ||
      form.priority !== (ticket.priority || 'low') ||
      form.projectId !== ticketProjId ||
      JSON.stringify([...form.assigneeIds].sort()) !== JSON.stringify([...ticketAssignees].sort()) ||
      JSON.stringify([...form.teamIds].sort()) !== JSON.stringify([...ticketTeams].sort()) ||
      form.tags !== ticketTags ||
      form.startDate !== ticketStart ||
      form.endDate !== ticketEnd;

    // Check if attachments list changed (e.g. immediate uploads or deletions)
    const initialAttachments = (ticket.attachments || []).map(a => a._id);
    const currentAttachments = (localAttachments || []).map(a => a._id);
    const hasAttachmentChanges = JSON.stringify(initialAttachments) !== JSON.stringify(currentAttachments);

    return hasFieldChanges || hasAttachmentChanges || pendingFiles.length > 0 || pendingLinks.length > 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }

    const payload = {
      title:       form.title.trim(),
      description: form.description.trim(),
      status:      form.status,
      priority:    form.priority,
      projectId:   form.projectId ? Number(form.projectId) : null,
      assigneeIds: form.assigneeIds.map(Number),
      teamIds:     form.teamIds,
      tags:        form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      startDate:   form.startDate || null,
      endDate:     form.endDate || null,
    };

    setSaving(true);
    try {
      if (isEdit) {
        const updatedTicket = await updateTicket(ticket.ticketNumber, payload);
        if (!updatedTicket) {
          setSaving(false);
          return;
        }
        
        // Handle any pending attachments that weren't uploaded immediately
        if (pendingFiles.length > 0 || pendingLinks.length > 0) {
          for (const file of pendingFiles) {
            const fd = new FormData();
            fd.append('file', file);
            await ticketAPI.addFileAttachment(ticket.ticketNumber, fd).catch(() => {});
          }
          for (const link of pendingLinks) {
            await ticketAPI.addLinkAttachment(ticket.ticketNumber, link).catch(() => {});
          }
        }
      } else {
        const newTicket = await createTicket(payload);
        
        if (!newTicket) {
          setSaving(false);
          return;
        }

        if (pendingFiles.length > 0 || pendingLinks.length > 0) {
          toast.success('Uploading attachments...');
          for (const file of pendingFiles) {
            const fd = new FormData();
            fd.append('file', file);
            await ticketAPI.addFileAttachment(newTicket.ticketNumber, fd).catch(() => toast.error(`Failed to upload ${file.name}`));
          }
          for (const link of pendingLinks) {
            await ticketAPI.addLinkAttachment(newTicket.ticketNumber, link).catch(() => toast.error(`Failed to add link ${link.name}`));
          }
        }

        if (newTicket?.ticketNumber) {
          if (payload.projectId) {
            navigate(`/projects/${payload.projectId}/tickets/${newTicket.ticketNumber}`);
          } else {
            navigate(`/tickets/${newTicket.ticketNumber}`);
          }
        }
      }
      onClose();
    } catch {
      toast.error(isEdit ? 'Failed to update ticket' : 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Ticket #${ticket.ticketNumber}` : 'Create New Ticket'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            size="sm" 
            loading={saving} 
            onClick={handleSubmit}
            disabled={isEdit && !isChanged()}
          >
            {isEdit ? 'Save Changes' : 'Create Ticket'}
          </Button>
        </>
      }
    >
      {/* Scrollable form body */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className={LABEL}>Title <span className="text-danger">*</span></label>
          <input
            id="tf-title"
            type="text"
            placeholder="Brief description of the issue…"
            className={FIELD}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className={LABEL}>Description</label>
          <textarea
            id="tf-description"
            rows={4}
            placeholder="Provide details, steps to reproduce, expected vs actual behavior…"
            className={`${FIELD} resize-none`}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* Project */}
        <div>
          <label className={LABEL}>Project</label>
          <select
            id="tf-project"
            className={FIELD}
            value={form.projectId}
            onChange={(e) => {
              const newProjId = e.target.value;
              set('projectId', newProjId);
              if (!contextProjectId) {
                fetchUsersAndTeams(newProjId || null);
              }
            }}
            disabled={!!defaultProjId && !isEdit}
          >
            <option value="">No project (Global Ticket)</option>
            {projects.map((p) => (
              <option key={p.projectId} value={String(p.projectId)}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Status + Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Status</label>
            <select id="tf-status" className={FIELD} value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{labelMap[s]}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Priority</label>
            <select id="tf-priority" className={FIELD} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Dates + Assignee */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Start Date</label>
              <input 
                id="tf-start-date" 
                type="date" 
                min={today}
                className={FIELD} 
                value={form.startDate} 
                onChange={(e) => set('startDate', e.target.value)} 
              />
            </div>
            <div>
              <label className={LABEL}>End Date</label>
              <input 
                id="tf-end-date" 
                type="date" 
                min={form.startDate || today}
                className={FIELD} 
                value={form.endDate} 
                onChange={(e) => set('endDate', e.target.value)} 
              />
            </div>
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Assignee Users</label>
            <UserMentionSelect 
              users={users} 
              value={form.assigneeIds} 
              onChange={(val) => set('assigneeIds', val)} 
              className={FIELD} 
            />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Assignee Teams</label>
            <TeamMentionSelect 
              teams={teams} 
              value={form.teamIds} 
              onChange={(val) => set('teamIds', val)} 
              className={FIELD} 
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className={LABEL}>Tags</label>
          <input
            id="tf-tags"
            type="text"
            placeholder="bug, frontend, urgent  (comma-separated)"
            className={FIELD}
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
          />
        </div>

        {/* Attachments Section */}
        <div className="pt-2 border-t border-gray-100">
          <TicketAttachments 
            attachments={localAttachments}
            ticketNumber={ticket?.ticketNumber}
            onAdded={(t) => setLocalAttachments(t.attachments)}
            onRemove={async (attId) => {
              try {
                await ticketAPI.removeAttachment(ticket.ticketNumber, attId);
                setLocalAttachments(prev => prev.filter(a => a._id !== attId));
              } catch {
                toast.error('Failed to remove attachment');
              }
            }}
            pendingFiles={pendingFiles}
            pendingLinks={pendingLinks}
            onAddPendingFile={(f) => setPendingFiles(p => [...p, f])}
            onAddPendingLink={(l) => setPendingLinks(p => [...p, l])}
            onRemovePendingFile={(f) => setPendingFiles(p => p.filter(x => x !== f))}
            onRemovePendingLink={(l) => setPendingLinks(p => p.filter(x => x !== l))}
          />
        </div>
      </form>
    </Modal>
  );
}
