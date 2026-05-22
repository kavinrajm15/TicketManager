import { create } from 'zustand';
import { ticketAPI, projectAPI } from '../services/api';
import toast from 'react-hot-toast';

const useTicketStore = create((set, get) => ({
  tickets: [],
  currentTicket: null,
  viewMode: 'list', 
  loading: false,
  error: null,
  totalTickets: 0,
  totalPages: 1,

  setViewMode: (mode) => set({ viewMode: mode }),

  fetchTickets: async (params) => {
    set({ loading: true, error: null });
    try {
      const { data } = await ticketAPI.getAll(params);
      set({ 
        tickets: data.tickets, 
        totalTickets: data.total,
        totalPages: data.pages,
        loading: false 
      });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch tickets' });
    }
  },

  fetchMyTickets: async (params) => {
    set({ loading: true, error: null });
    try {
      const { data } = await ticketAPI.getMine(params);
      set({ 
        tickets: data.tickets, 
        totalTickets: data.total,
        totalPages: data.pages,
        loading: false 
      });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch my tickets' });
    }
  },

  fetchProjectTickets: async (projectId, params) => {
    set({ loading: true, error: null });
    try {
      const { data } = await projectAPI.getTickets(projectId, params);
      set({ 
        tickets: data.tickets, 
        totalTickets: data.total,
        totalPages: data.pages,
        loading: false 
      });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to fetch tickets' });
    }
  },

  fetchTicket: async (id) => {
    set({ loading: true, error: null });
    try {
      const { data } = await ticketAPI.getById(id);
      set({ currentTicket: data.ticket, loading: false });
      return data.ticket;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch ticket';
      set({ loading: false, error: msg });
      toast.error(msg);
      return null;
    }
  },

  createTicket: async (ticketData) => {
    try {
      const { data } = await ticketAPI.create(ticketData);
      set((state) => ({ tickets: [data.ticket, ...state.tickets] }));
      toast.success('Ticket created!');
      return data.ticket;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
      return null;
    }
  },

  updateTicket: async (id, ticketData) => {
    try {
      const { data } = await ticketAPI.update(id, ticketData);
      set((state) => ({
        tickets: state.tickets.map((t) => t.ticketNumber === id ? data.ticket : t),
        currentTicket: state.currentTicket?.ticketNumber === id ? data.ticket : state.currentTicket,
      }));
      toast.success('Ticket updated!');
      return data.ticket;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update ticket');
      return null;
    }
  },

  deleteTicket: async (id) => {
    try {
      await ticketAPI.delete(id);
      set((state) => ({ tickets: state.tickets.filter((t) => t.ticketNumber !== id) }));
      toast.success('Ticket deleted');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ticket');
      return false;
    }
  },

  // Optimistic Kanban status update
  moveTicket: async (ticketNumber, newStatus) => {
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.ticketNumber === ticketNumber ? { ...t, status: newStatus } : t
      ),
    }));
    try {
      await ticketAPI.update(ticketNumber, { status: newStatus });
    } catch {
      get().fetchTickets();
    }
  },
}));

export default useTicketStore;
