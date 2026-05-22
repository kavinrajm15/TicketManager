import { create } from 'zustand';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem('tm_user') || 'null'); }
  catch { return null; }
};

const useAuthStore = create((set) => ({
  user:  getStoredUser(),
  token: localStorage.getItem('tm_token') || null,
  loading: false,

  login: async (credentials) => {
    set({ loading: true });
    try {
      const { data } = await authAPI.login(credentials);
      localStorage.setItem('tm_token', data.token);
      localStorage.setItem('tm_user',  JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      toast.success(`Welcome back, ${data.user.name}!`);
      return true;
    } catch (err) {
      set({ loading: false });
      const msg = err.response?.data?.message || 'Login failed';
      
      if (msg.toLowerCase().includes('inactive')) {
        Swal.fire({
          title: 'Account Inactive',
          text: 'Your account is currently inactive. Please contact the administrator to reactivate your access.',
          icon: 'warning',
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'Got it'
        });
      } else {
        toast.error(msg);
      }
      return false;
    }
  },

  register: async (data) => {
    set({ loading: true });
    try {
      const res = await authAPI.register(data);
      localStorage.setItem('tm_token', res.data.token);
      localStorage.setItem('tm_user',  JSON.stringify(res.data.user));
      set({ user: res.data.user, token: res.data.token, loading: false });
      toast.success('Account created successfully!');
      return true;
    } catch (err) {
      set({ loading: false });
      toast.error(err.response?.data?.message || 'Registration failed');
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_user');
    set({ user: null, token: null });
    toast.success('Logged out successfully');
  },

  updateUser: (updatedUser) => {
    localStorage.setItem('tm_user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  refreshUser: async () => {
    try {
      const { data } = await authAPI.me();
      localStorage.setItem('tm_user', JSON.stringify(data.user));
      set({ user: data.user });
    } catch {
      // Silently ignore — if the token has expired the 401 interceptor in
      // api.js will redirect to /login automatically.
    }
  },
}));

export default useAuthStore;