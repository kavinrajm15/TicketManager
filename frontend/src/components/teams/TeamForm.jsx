import { useState, useEffect } from 'react';
import useTeamStore from '../../store/useTeamStore';
import useProjectStore from '../../store/useProjectStore';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import UserMentionSelect from '../ui/UserMentionSelect';
import ProjectSelect from '../ui/ProjectSelect';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function TeamForm({ isOpen, onClose, team = null }) {
  const { createTeam, updateTeam } = useTeamStore();
  const { projects, fetchProjects } = useProjectStore();

  const isEdit = !!team;

  const [form, setForm] = useState({
    teamName: '',
    teamLead: '',
    members: [],
    projects: [],
  });

  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      userAPI.getAll().then(({ data }) => setUsers(data.users)).catch(() => {});
      
      if (team) {
        setForm({
          teamName: team.teamName || '',
          teamLead: team.teamLead ? String(team.teamLead.userId) : '',
          members: team.members ? team.members.map(m => String(m.userId)) : [],
          projects: team.projects ? team.projects.map(p => String(p.projectId)) : [],
        });
      } else {
        setForm({
          teamName: '',
          teamLead: '',
          members: [],
          projects: [],
        });
      }
    }
  }, [isOpen, team]);

  const isChanged = () => {
    if (!isEdit) return true;
    
    const initialLead = team.teamLead ? String(team.teamLead.userId) : '';
    const initialMembers = team.members ? team.members.map(m => String(m.userId)) : [];
    const initialProjects = team.projects ? team.projects.map(p => String(p.projectId)) : [];

    return (
      form.teamName !== (team.teamName || '') ||
      form.teamLead !== initialLead ||
      JSON.stringify([...form.members].sort()) !== JSON.stringify([...initialMembers].sort()) ||
      JSON.stringify([...form.projects].sort()) !== JSON.stringify([...initialProjects].sort())
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.teamName.trim()) return toast.error('Team name is required');
    if (!form.teamLead) return toast.error('Team lead is required');

    const payload = {
      teamName: form.teamName.trim(),
      teamLead: Number(form.teamLead),
      members: form.members.map(Number),
      projects: form.projects.map(Number),
    };

    setSaving(true);
    try {
      if (isEdit) {
        const updated = await updateTeam(team._id, payload);
        if (!updated) {
          setSaving(false);
          return;
        }
      } else {
        const created = await createTeam(payload);
        if (!created) {
          setSaving(false);
          return;
        }
      }
      onClose();
    } catch {
      toast.error(isEdit ? 'Failed to update team' : 'Failed to create team');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Team' : 'Create Team'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Team Name */}
        <div>
          <label className="block text-sm font-semibold text-textMain mb-1.5">Team Name <span className="text-danger">*</span></label>
          <input
            type="text"
            value={form.teamName}
            onChange={(e) => setForm({ ...form, teamName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
            placeholder="e.g. Frontend Engineers"
            required
          />
        </div>

        {/* Project Links */}
        <div>
          <label className="block text-sm font-semibold text-textMain mb-1.5">Linked Projects</label>
          <ProjectSelect
            projects={projects}
            value={form.projects}
            onChange={(ids) => setForm({ ...form, projects: ids })}
            placeholder="Select projects..."
          />
        </div>

        {/* Team Lead */}
        <div>
          <label className="block text-sm font-semibold text-textMain mb-1.5">Team Lead <span className="text-danger">*</span></label>
          <UserMentionSelect
            users={users}
            value={form.teamLead ? [form.teamLead] : []}
            onChange={(ids) => setForm({ ...form, teamLead: ids[0] || '' })}
            multiSelect={false}
            placeholder="Select a team lead..."
          />
        </div>

        {/* Members */}
        <div>
          <label className="block text-sm font-semibold text-textMain mb-1.5">Team Members</label>
          <UserMentionSelect
            users={users}
            value={form.members}
            onChange={(ids) => setForm({ ...form, members: ids })}
            multiSelect={true}
            placeholder="Add members to team..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            isLoading={saving}
            disabled={isEdit && !isChanged()}
          >
            {isEdit ? 'Save Changes' : 'Create Team'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
