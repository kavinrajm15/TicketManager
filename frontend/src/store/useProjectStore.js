import { create } from 'zustand';
import { projectAPI } from '../services/api';
import toast from 'react-hot-toast';

const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await projectAPI.getAll();
      set({ projects: data.projects, loading: false });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch projects' });
    }
  },

  fetchProject: async (id) => {
    set({ loading: true, error: null });
    try {
      const { data } = await projectAPI.getById(id);
      set({ currentProject: data.project, loading: false });
      return data.project;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch project';
      set({ loading: false, error: msg });
      toast.error(msg);
      return null;
    }
  },

  createProject: async (projectData) => {
    try {
      const { data } = await projectAPI.create(projectData);
      set((state) => ({ projects: [data.project, ...state.projects] }));
      toast.success('Project created!');
      return data.project;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
      return null;
    }
  },

  updateProject: async (id, projectData) => {
    try {
      const { data } = await projectAPI.update(id, projectData);
      set((state) => ({
        projects: state.projects.map((p) => p.projectId === id ? data.project : p),
        currentProject: state.currentProject?.projectId === id ? data.project : state.currentProject,
      }));
      toast.success('Project updated!');
      return data.project;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project');
      return null;
    }
  },

  deleteProject: async (id) => {
    try {
      await projectAPI.delete(id);
      set((state) => ({ projects: state.projects.filter((p) => p.projectId !== id) }));
      toast.success('Project deleted');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
      return false;
    }
  },

  addMember: async (projectId, memberData) => {
    try {
      const { data } = await projectAPI.addMember(projectId, memberData);
      set({ currentProject: data.project });
      toast.success('Member added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  },

  removeMember: async (projectId, userId) => {
    try {
      const { data } = await projectAPI.removeMember(projectId, userId);
      set({ currentProject: data.project });
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  },
}));

export default useProjectStore;
