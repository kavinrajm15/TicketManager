import { create } from 'zustand';
import { teamAPI } from '../services/api';
import toast from 'react-hot-toast';

const useTeamStore = create((set, get) => ({
  teams: [],
  loading: false,
  error: null,

  fetchTeams: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await teamAPI.getAll();
      set({ teams: data.teams, loading: false });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch teams' });
    }
  },

  createTeam: async (teamData) => {
    try {
      const { data } = await teamAPI.create(teamData);
      set((state) => ({ teams: [data.team, ...state.teams] }));
      toast.success('Team created successfully!');
      return data.team;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create team');
      return null;
    }
  },

  updateTeam: async (id, teamData) => {
    try {
      const { data } = await teamAPI.update(id, teamData);
      set((state) => ({
        teams: state.teams.map((t) => t._id === id ? data.team : t),
      }));
      toast.success('Team updated successfully!');
      return data.team;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update team');
      return null;
    }
  },

  deleteTeam: async (id) => {
    try {
      await teamAPI.delete(id);
      set((state) => ({ teams: state.teams.filter((t) => t._id !== id) }));
      toast.success('Team deleted');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete team');
      return false;
    }
  },
}));

export default useTeamStore;
