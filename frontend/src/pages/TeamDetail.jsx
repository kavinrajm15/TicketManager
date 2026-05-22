import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { teamAPI } from '../services/api';
import useAuthStore from '../store/useAuthStore';
import useTeamStore from '../store/useTeamStore';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { RoleBadge } from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';
import TeamForm from '../components/teams/TeamForm';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { deleteTeam } = useTeamStore();
  
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchTeam = async () => {
    try {
      const { data } = await teamAPI.getById(id);
      setTeam(data.team);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch team details');
      navigate('/teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchTeam();
  }, [id, navigate]);

  const canManage = ['superadmin', 'manager'].includes(user?.role);

  const handleDelete = async () => {
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
      try {
        await deleteTeam(team._id);
        navigate('/teams');
      } catch (err) {
        // silent, store handles toast
      }
    }
  };

  if (loading) return <PageLoader />;
  if (!team) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
              onClick={() => navigate("/teams")}
              className="hover:text-primary transition-colors whitespace-nowrap"
            >
              Teams
            </button>
            <span className="flex-shrink-0">/</span>
            <span className="text-textMain font-medium truncate">
              {team?.teamName || "Loading…"}
            </span>
          </div>
        </div>
      </div>

      {/* Team Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
              {team.teamName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-textMain">{team.teamName}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-textMuted">Team Lead:</span>
                <div className="flex items-center gap-2 bg-primary/5 px-3 py-1 rounded-full">
                  <Avatar user={team.teamLead} size="xs" />
                  <span className="text-sm font-semibold text-primary">{team.teamLead?.name}</span>
                </div>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-3">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setShowForm(true)}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              >
                Edit Team
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={handleDelete}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-textMain px-1">Team Members ({team.members?.length || 0})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {team.members?.map((member) => (
              <div key={member._id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:border-primary/20 transition-colors">
                <Avatar user={member} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-textMain truncate">{member.name}</p>
                  <p className="text-xs text-textMuted truncate">{member.email}</p>
                  <div className="mt-1">
                    <RoleBadge role={member.role} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-textMain px-1">Assigned Projects</h2>
          <div className="space-y-3">
            {team.projects?.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center">
                <p className="text-sm text-textMuted">No projects assigned yet</p>
              </div>
            ) : (
              team.projects.map((project) => (
                <Link
                  key={project._id}
                  to={`/projects/${project.projectId}`}
                  className="block bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-primary/20 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold text-xs group-hover:bg-primary group-hover:text-white transition-colors">
                        {project.key}
                      </div>
                      <span className="text-sm font-bold text-textMain group-hover:text-primary transition-colors">{project.name}</span>
                    </div>
                    <svg className="w-4 h-4 text-textMuted group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <TeamForm 
        isOpen={showForm} 
        onClose={() => {
          setShowForm(false);
          fetchTeam();
        }} 
        team={team} 
      />
    </div>
  );
}
