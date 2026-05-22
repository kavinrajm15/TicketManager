import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useProjectStore from '../store/useProjectStore';
import useAuthStore from '../store/useAuthStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import ProjectEditModal from '../components/projects/ProjectEditModal';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function Projects() {
 const navigate = useNavigate();
 const { user } = useAuthStore();
 const { projects, loading, fetchProjects, createProject, deleteProject } = useProjectStore();

 const [showCreate, setShowCreate] = useState(false);
 const [search, setSearch] = useState('');
 const [form, setForm] = useState({ name: '', description: '' });
 const [saving, setSaving] = useState(false);
 const [editProject, setEditProject] = useState(null);

 useEffect(() => { fetchProjects(); }, []);

 const isManager = ['superadmin', 'manager'].includes(user?.role);

 const filtered = projects.filter((p) =>
 p.name.toLowerCase().includes(search.toLowerCase()) ||
 p.key?.toLowerCase().includes(search.toLowerCase())
 );

 const handleCreate = async (e) => {
 e.preventDefault();
 if (!form.name.trim()) { toast.error('Project name is required'); return; }
 setSaving(true);
 const result = await createProject(form);
 setSaving(false);
 if (result) { setShowCreate(false); setForm({ name: '', description: '' }); }
 };

 const handleDelete = async (project) => {
 const result = await Swal.fire({
 title: 'Delete Project?',
 text: `"${project.name}" and all its data will be permanently deleted.`,
 icon: 'warning',
 showCancelButton: true,
 confirmButtonColor: '#FF5630',
 cancelButtonColor: '#42526E',
 confirmButtonText: 'Yes, delete it',
 });
 if (result.isConfirmed) deleteProject(project.projectId);
 };

 if (loading && projects.length === 0) return <PageLoader />;

 return (
 <div className="space-y-6 ">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-xl font-bold text-textMain">Projects</h2>
 <p className="text-sm text-textMuted mt-0.5">{projects.length} projects total</p>
 </div>
 {isManager && (
 <Button id="create-project-btn" onClick={() => setShowCreate(true)} icon={
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
 </svg>
 }>
 New Project
 </Button>
 )}
 </div>

 {/* Search */}
 <div className="relative max-w-sm">
 <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted"
 fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
 </svg>
 <input
 id="project-search"
 type="text"
 placeholder="Search projects…"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/30"
 />
 </div>

 {/* Grid */}
 {filtered.length === 0 ? (
 <EmptyState
 icon="📁"
 title="No projects found"
 description={search ? 'Try a different search term' : 'Create your first project to get started'}
 action={isManager && <Button onClick={() => setShowCreate(true)}>Create Project</Button>}
 />
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {filtered.map((project) => (
 <Card
 key={project.projectId}
 hover
 onClick={() => navigate(`/projects/${project.projectId}`)}
 className="p-5 group"
 >
 {/* Header */}
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
 <span className="text-sm font-bold text-primary">
 {project.key?.slice(0, 2) || project.name.slice(0, 2).toUpperCase()}
 </span>
 </div>
 <div>
 <h3 className="text-sm font-bold text-textMain leading-tight">{project.name}</h3>
 <span className="text-xs text-textMuted font-mono">{project.key}</span>
 </div>
 </div>
 {/* Card actions: edit + delete */}
 {isManager && (
 <div className="flex items-center gap-1">
 <button
 id={`edit-project-${project.projectId}`}
 onClick={(e) => { e.stopPropagation(); setEditProject(project); }}
 className="w-7 h-7 rounded-lg flex items-center justify-center text-textMuted hover:bg-blue-50 hover:text-primary opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
 title="Edit project"
 >
 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
 </svg>
 </button>
 <button
 id={`delete-project-${project.projectId}`}
 onClick={(e) => { e.stopPropagation(); handleDelete(project); }}
 className="w-7 h-7 rounded-lg flex items-center justify-center text-textMuted hover:bg-red-50 hover:text-danger opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
 title="Delete project"
 >
 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
 </svg>
 </button>
 </div>
 )}
 </div>

 {/* Description */}
 {project.description && (
 <p className="text-xs text-textMuted line-clamp-2 mb-4">{project.description}</p>
 )}

 {/* Footer — owner + date */}
 <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
 {project.owner ? (
 <div className="flex items-center gap-1.5">
 <Avatar user={project.owner} size="xs" />
 <div className="min-w-0">
 <span className="text-[10px] text-textMuted block leading-none mb-0.5">Created by</span>
 <span className="text-[11px] font-semibold text-textMain truncate block leading-none max-w-[100px]">
 {project.owner.name}
 </span>
 </div>
 </div>
 ) : (
 <span className="text-xs text-textMuted">—</span>
 )}
 <span className="text-xs text-textMuted">{fmtDate(project.createdAt)}</span>
 </div>
 </Card>
 ))}
 </div>
 )}

 {/* Create Modal */}
 <Modal
 isOpen={showCreate}
 onClose={() => { setShowCreate(false); setForm({ name: '', description: '' }); }}
 title="Create New Project"
 size="md"
 footer={
 <>
 <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
 <Button variant="primary" size="sm" loading={saving} onClick={handleCreate}>Create Project</Button>
 </>
 }
 >
 <form onSubmit={handleCreate} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">
 Project Name <span className="text-danger">*</span>
 </label>
 <input
 id="new-project-name"
 className="block w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
 placeholder="My Project"
 value={form.name}
 onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
 required
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">Description</label>
 <textarea
 id="new-project-description"
 className="block w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
 placeholder="What is this project about?"
 rows={3}
 value={form.description}
 onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
 />
 </div>
 </form>
 </Modal>

 {/* Edit Modal */}
 <ProjectEditModal
 isOpen={!!editProject}
 onClose={() => setEditProject(null)}
 project={editProject}
 onUpdated={() => { setEditProject(null); fetchProjects(); }}
 />
 </div>
 );
}
