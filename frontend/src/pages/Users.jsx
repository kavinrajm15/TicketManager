import { useEffect, useState } from 'react';
import { userAPI } from '../services/api';
import useAuthStore from '../store/useAuthStore';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { RoleBadge } from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const ROLES = ['superadmin', 'manager', 'teamlead', 'member'];
const ROLE_LABELS = { superadmin:'Super Admin', manager:'Manager', teamlead:'Team Lead', member:'Member' };

const FIELD = 'block w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30';

function PasswordRequirements({ password }) {
  const requirements = [
    { label: "Min 8 characters", test: (v) => v.length >= 8 },
    { label: "1 Capital letter", test: (v) => /[A-Z]/.test(v) },
    { label: "1 Number", test: (v) => /[0-9]/.test(v) },
    { label: "1 Special char", test: (v) => /[^A-Za-z0-9]/.test(v) },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
      {requirements.map((req, idx) => {
        const isMet = req.test(password);
        return (
          <div key={idx} className="flex items-center gap-1.5">
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${isMet ? 'bg-success/10 text-success' : 'bg-gray-200 text-gray-400'}`}>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className={`text-[10px] font-medium ${isMet ? 'text-success' : 'text-textMuted'}`}>
              {req.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Users() {
  const { user: me, updateUser } = useAuthStore();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editModal, setEditModal] = useState(null); // { user }
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'inactive'

  const [createForm, setCreateForm] = useState({ name:'', email:'', password:'', role:'member' });
  const [editForm, setEditForm] = useState({ name:'', email:'', password:'', role:'' });

  const isUserChanged = editModal && (
    editForm.name !== editModal.user.name ||
    editForm.email !== editModal.user.email ||
    editForm.role !== editModal.user.role ||
    editForm.password !== ''
  );

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await userAPI.getAll({ page, limit, isActive: activeTab === 'active' });
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, limit, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Create User ─────────────────────────────────────────── */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('All fields are required'); return;
    }
    const pass = createForm.password;
    const isValidPass = pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass);
    if (!isValidPass) {
      toast.error('Password does not meet requirements'); return;
    }
    setSaving(true);
    try {
      await userAPI.create(createForm);
      toast.success('User created!');
      setShowCreate(false);
      setCreateForm({ name:'', email:'', password:'', role:'member' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally { setSaving(false); }
  };

  /* ── Update User ─────────────────────────────────────────── */
  const handleUpdateUser = async (e) => {
    if (e) e.preventDefault();
    if (!editModal) return;
    
    // If password is provided, validate it
    if (editForm.password) {
      const pass = editForm.password;
      const isValidPass = pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass);
      if (!isValidPass) {
        toast.error('Password does not meet requirements'); return;
      }
    }

    setSaving(true);
    try {
      await userAPI.update(editModal.user.userId, editForm);
      toast.success('User updated successfully');
      setEditModal(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally { setSaving(false); }
  };



  /* ── Toggle Status ─────────────────────────────────────────── */
  const handleToggleStatus = async (u) => {
    try {
      await userAPI.updateStatus(u.userId, u.isActive === false ? true : false);
      toast.success(`User ${u.name} is now ${u.isActive === false ? 'Active' : 'Inactive'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-5 ">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-textMain">Users</h2>
          <p className="text-sm text-textMuted mt-0.5">{total} {activeTab === 'active' ? 'active' : 'inactive'} team members</p>
        </div>
        <Button
          id="create-user-btn"
          onClick={() => setShowCreate(true)}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"/>
            </svg>
          }
        >
          Add User
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-100">
        <button
          onClick={() => handleTabChange('active')}
          className={`text-sm font-semibold pb-2.5 border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-primary text-primary'
              : 'border-transparent text-textMuted hover:text-textMain'
          }`}
        >
          Active Users
        </button>
        <button
          onClick={() => handleTabChange('inactive')}
          className={`text-sm font-semibold pb-2.5 border-b-2 transition-colors ${
            activeTab === 'inactive'
              ? 'border-primary text-primary'
              : 'border-transparent text-textMuted hover:text-textMain'
          }`}
        >
          Inactive Users
        </button>
      </div>

      {/* Search and Pagination */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <input
            id="users-search"
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Simple Pagination */}
        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-9 px-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
            </Button>
            <span className="text-xs font-bold text-textMuted px-2">{page} / {totalPages}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-9 px-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Users table */}
      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState icon="👥" title="No users found" description="Try a different search or add a new user" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-[minmax(0,3fr)_180px_150px_100px_130px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
                {['User', 'Role', 'User ID', 'Status', ''].map((h) => (
                  <span key={h} className="text-[10px] font-bold text-textMuted uppercase tracking-wider">{h}</span>
                ))}
              </div>

              <div className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <div key={u.userId} className="grid grid-cols-[minmax(0,3fr)_180px_150px_100px_130px] gap-4 px-6 py-4 items-center hover:bg-gray-50/60 transition-colors group">
                    {/* User info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        <Avatar user={u} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-textMain truncate">{u.name}</p>
                          {u.userId === me?.userId && (
                            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">You</span>
                          )}
                        </div>
                        <p className="text-xs text-textMuted truncate">{u.email}</p>
                      </div>
                    </div>

                    {/* Role badge */}
                    <div className="flex items-center">
                      <RoleBadge role={u.role} />
                    </div>

                    {/* User ID */}
                    <div className="flex items-center">
                      <span className="text-xs font-mono text-textMuted bg-gray-50 px-2 py-1 rounded border border-gray-100">#{u.userId}</span>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center">
                      <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md border ${u.isActive !== false ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                      {me?.role === 'superadmin' && u.userId !== me?.userId && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title={u.isActive !== false ? "Deactivate User" : "Activate User"}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-textMuted hover:bg-yellow-50 hover:text-yellow-600 transition-all shadow-sm border border-transparent hover:border-yellow-100"
                        >
                          {u.isActive !== false ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                      )}

                      <button
                        id={`edit-user-${u.userId}`}
                        onClick={() => { 
                          setEditModal({ user: u }); 
                          setEditForm({ name: u.name, email: u.email, role: u.role, password: '' }); 
                        }}
                        disabled={u.userId === me?.userId || me?.role !== 'superadmin'}
                        title={u.userId === me?.userId ? "You cannot edit yourself here" : "Edit User"}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm border border-transparent ${
                          u.userId === me?.userId || me?.role !== 'superadmin'
                            ? 'text-gray-200 cursor-not-allowed hidden'
                            : 'text-textMuted hover:bg-blue-50 hover:text-primary hover:border-blue-100'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
                        </svg>
                      </button>


                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreateForm({ name:'', email:'', password:'', role:'member' }); }}
        title="Add New User"
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleCreate}>Create User</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {[
            { id:'cu-name', label:'Full Name', type:'text', key:'name', placeholder:'John Doe' },
            { id:'cu-email', label:'Email', type:'email', key:'email', placeholder:'john@company.com' },
          ].map(({ id, label, type, key, placeholder }) => (
            <div key={key}>
              <label htmlFor={id} className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">{label}</label>
              <input
                id={id} type={type} placeholder={placeholder}
                className={FIELD}
                value={createForm[key]}
                onChange={(e) => setCreateForm((f) => ({ ...f, [key]: e.target.value }))}
                required
              />
            </div>
          ))}

          {/* Password field with toggle */}
          <div>
            <label htmlFor="cu-pass" className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">Password</label>
            <div className="relative">
              <input
                id="cu-pass"
                type={showPass ? 'text' : 'password'}
                placeholder="Min 8 characters"
                className={FIELD + " pr-10"}
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain transition-colors"
              >
                {showPass ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                )}
              </button>
            </div>
            <PasswordRequirements password={createForm.password} />
          </div>
          <div>
            <label htmlFor="cu-role" className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">Role</label>
            <select
              id="cu-role"
              className={FIELD}
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title={`Edit User — ${editModal?.user.name}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button 
              variant="primary" 
              size="sm" 
              loading={saving} 
              onClick={handleUpdateUser}
              disabled={!isUserChanged}
            >
              Update User
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">Full Name</label>
            <input
              type="text" className={FIELD}
              value={editForm.name}
              onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">Email</label>
            <input
              type="email" className={FIELD}
              value={editForm.email}
              onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">Role</label>
            <select
              className={FIELD}
              value={editForm.role}
              onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1">
              New Password <span className="text-[10px] lowercase font-normal">(leave blank to keep current)</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Enter new password"
                className={FIELD + " pr-10"}
                value={editForm.password}
                onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted"
              >
                {showPass ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                )}
              </button>
            </div>
            {editForm.password && <PasswordRequirements password={editForm.password} />}
          </div>
        </form>
      </Modal>
    </div>
  );
}