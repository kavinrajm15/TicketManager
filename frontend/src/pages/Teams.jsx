import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useTeamStore from '../store/useTeamStore';
import useAuthStore from '../store/useAuthStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import TeamForm from '../components/teams/TeamForm';
import Swal from 'sweetalert2';

export default function Teams() {
  const { user } = useAuthStore();
  const { teams, loading, fetchTeams, deleteTeam } = useTeamStore();
  
  const [showForm, setShowForm] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  const canManageTeams = ['superadmin', 'manager'].includes(user?.role);

  const filtered = teams.filter((t) => {
    if (!search) return true;
    return t.teamName.toLowerCase().includes(search.toLowerCase());
  });

  const handleEdit = (team) => {
    setEditTeam(team);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditTeam(null);
  };

  const handleDelete = async (team) => {
    const res = await Swal.fire({
      title: `Delete Team "${team.teamName}"?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF5630',
      cancelButtonColor: '#42526E',
      confirmButtonText: 'Delete',
    });
    if (res.isConfirmed) {
      deleteTeam(team._id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-textMain">Teams</h2>
          <p className="text-sm text-textMuted mt-0.5">{teams.length} total teams</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-64 hidden sm:block">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
            <input
              type="text"
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {canManageTeams && (
            <Button onClick={() => setShowForm(true)} icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
              </svg>
            }>
              New Team
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading && teams.length === 0 ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No teams found"
          description={search ? "Try adjusting your search" : "No teams have been created yet."}
          action={canManageTeams && !search && <Button onClick={() => setShowForm(true)}>Create Team</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(team => (
            <Link key={team._id} to={`/teams/${team._id}`} className="block group">
              <Card className="p-5 hover:shadow-md transition-all group flex flex-col h-full cursor-pointer border border-gray-100 hover:border-primary/20">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-textMain text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {team.teamName}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {team.projects && team.projects.length > 0 ? (
                        team.projects.map(p => (
                          <span key={p.projectId} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider">
                            {p.key}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-textMuted text-[10px] font-bold rounded uppercase tracking-wider">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  {/* Lead */}
                  <div>
                    <p className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">Team Lead</p>
                    <div className="flex items-center gap-2">
                      <Avatar user={team.teamLead} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-textMain">{team.teamLead?.name || 'Unknown'}</p>
                        <p className="text-xs text-textMuted">{team.teamLead?.email || ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Members */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-textMuted uppercase tracking-wider">Members</p>
                      <span className="text-xs font-medium bg-gray-100 text-textMuted px-2 py-0.5 rounded-full">
                        {team.members?.length || 0}
                      </span>
                    </div>
                    {team.members?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {team.members.slice(0, 5).map(member => (
                          <div key={member.userId} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-md px-2 py-1">
                            <Avatar user={member} size="xs" />
                            <span className="text-xs text-textMain font-medium">{member.name}</span>
                          </div>
                        ))}
                        {team.members.length > 5 && (
                          <span className="text-[10px] text-textMuted font-medium ml-1">+{team.members.length - 5} more</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-textMuted italic">No members assigned.</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <TeamForm 
        isOpen={showForm} 
        onClose={handleClose} 
        team={editTeam} 
      />
    </div>
  );
}
