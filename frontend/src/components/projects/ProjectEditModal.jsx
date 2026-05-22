import { useEffect, useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { RoleBadge } from '../ui/Badge';
import { userAPI, teamAPI, projectAPI } from '../../services/api';
import UserMentionSelect from '../ui/UserMentionSelect';
import TeamMentionSelect from '../ui/TeamMentionSelect';
import toast from 'react-hot-toast';



/* ── Main Modal ──────────────────────────────────────────────────────────── */
const LABEL = 'block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1';
const FIELD = 'block w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white transition-all';

export default function ProjectEditModal({ isOpen, onClose, project, onUpdated }) {
  const [form, setForm]     = useState({ name: '', description: '' });
  const [teamIds, setTeamIds]             = useState([]);   // array of _id strings
  const [memberUserIds, setMemberUserIds] = useState([]);   // array of numeric userId strings
  const [allTeams, setAllTeams]           = useState([]);
  const [allUsers, setAllUsers]           = useState([]);
  const [saving, setSaving]               = useState(false);

  /* Populate when modal opens */
  useEffect(() => {
    if (!isOpen || !project) return;

    setForm({
      name:        project.name        || '',
      description: project.description || '',
    });

    // Pre-select teams
    setTeamIds((project.teams || []).map(t => t._id || t));

    // Pre-select members (excluding the owner)
    const nonOwnerMembers = (project.members || [])
      .filter(m => {
        const mId = m.user?._id || m.user;
        return mId?.toString() !== project.owner?._id?.toString();
      })
      .map(m => String(m.user?.userId ?? m.user));
    setMemberUserIds(nonOwnerMembers);

    // Fetch all teams + all users
    teamAPI.getAll().then(({ data }) => setAllTeams(data.teams || [])).catch(() => {});
    userAPI.getAll({ limit: 500 }).then(({ data }) => setAllUsers(data.users || [])).catch(() => {});
  }, [isOpen, project]);

  const isChanged = () => {
    if (!project) return false;

    // Pre-calculated initial states from useEffect
    const initialTeamIds = (project.teams || []).map(t => t._id || t);
    const initialMemberIds = (project.members || [])
      .filter(m => (m.user?._id || m.user)?.toString() !== project.owner?._id?.toString())
      .map(m => String(m.user?.userId ?? m.user));

    return (
      form.name !== (project.name || '') ||
      form.description !== (project.description || '') ||
      JSON.stringify([...teamIds].sort()) !== JSON.stringify([...initialTeamIds].sort()) ||
      JSON.stringify([...memberUserIds].sort()) !== JSON.stringify([...initialMemberIds].sort())
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required'); return; }

    setSaving(true);
    try {
      const payload = {
        name:          form.name.trim(),
        description:   form.description.trim(),
        teamIds,                                     // ObjectId strings
        memberUserIds: memberUserIds.map(Number),    // numeric userIds
      };
      const { data } = await projectAPI.update(project.projectId, payload);
      toast.success('Project updated!');
      onUpdated?.(data.project);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Project — ${project?.name || ''}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            size="sm" 
            loading={saving} 
            onClick={handleSubmit}
            disabled={!isChanged()}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className={LABEL}>Project Name <span className="text-danger">*</span></label>
          <input
            id="pe-name"
            type="text"
            className={FIELD}
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className={LABEL}>Description</label>
          <textarea
            id="pe-description"
            rows={3}
            className={`${FIELD} resize-none`}
            placeholder="What is this project about?"
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        {/* Teams */}
        <div>
          <label className={LABEL}>
            Assigned Teams
            <span className="ml-1 text-[10px] normal-case font-normal text-textMuted">(search by name)</span>
          </label>
          <TeamMentionSelect
            teams={allTeams}
            value={teamIds}
            onChange={setTeamIds}
            className={FIELD}
          />
        </div>

        {/* Members */}
        <div>
          <label className={LABEL}>
            Members
            <span className="ml-1 text-[10px] normal-case font-normal text-textMuted">(search by name)</span>
          </label>
          <UserMentionSelect
            users={allUsers.filter(u => {
              // Exclude the project owner from the picker (they're always a member)
              return u._id?.toString() !== project?.owner?._id?.toString() &&
                     u.userId !== project?.owner?.userId;
            })}
            value={memberUserIds}
            onChange={setMemberUserIds}
            className={FIELD}
          />
        </div>
      </form>
    </Modal>
  );
}
