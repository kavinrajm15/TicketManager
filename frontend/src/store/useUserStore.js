import { create } from 'zustand';
import { userAPI } from '../services/api';

const useUserStore = create((set) => ({
  users: [],
  loading: false,

  fetchUsers: async () => {
    set({ loading: true });
    try {
      const { data } = await userAPI.getAll();
      set({ users: data.users, loading: false });
    } catch (err) {
      set({ loading: false });
    }
  },
}));

export default useUserStore;
