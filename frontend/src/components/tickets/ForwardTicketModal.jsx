import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import UserMentionSelect from "../ui/UserMentionSelect";
import TeamMentionSelect from "../ui/TeamMentionSelect";
import { userAPI, teamAPI, ticketAPI } from "../../services/api";
import toast from "react-hot-toast";

const FIELD = 'block w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary bg-white transition-all';

export default function ForwardTicketModal({ isOpen, onClose, ticket, onForwarded }) {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      userAPI.getAll({ limit: 100 }).then(res => setUsers(res.data.users || []));
      teamAPI.getAll().then(res => setTeams(res.data.teams || []));
    } else {
      setSelectedUsers([]);
      setSelectedTeams([]);
      setMessage("");
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0 && selectedTeams.length === 0) {
      toast.error("Please select at least one user or team");
      return;
    }
    setLoading(true);
    try {
      const { data } = await ticketAPI.forwardTicket(ticket.ticketNumber, {
        toUserIds: selectedUsers,
        toTeamIds: selectedTeams,
        message,
      });
      toast.success("Ticket forwarded successfully");
      onForwarded(data.ticket);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to forward ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Forward Ticket #${ticket?.ticketNumber}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0 && selectedTeams.length === 0}
          >
            Forward Ticket
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-2">Message (Optional)</label>
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px]"
            placeholder="Add a message for the forwarded assignees..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-2">Forward to Users</label>
          <UserMentionSelect 
            users={users} 
            value={selectedUsers} 
            onChange={(val) => setSelectedUsers(val)} 
            className={FIELD} 
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-2">Forward to Teams</label>
          <TeamMentionSelect 
            teams={teams} 
            value={selectedTeams} 
            onChange={(val) => setSelectedTeams(val)} 
            className={FIELD} 
          />
        </div>
      </form>
    </Modal>
  );
}
