import { create } from 'zustand';
import { io } from 'socket.io-client';
import useNotificationStore from './useNotificationStore';
import useChatStore from './useChatStore';
import { showTicketAssignedToast } from '../components/ui/TicketAssignedToast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:5000`;

const useSocketStore = create((set, get) => ({
  socket: null,
  onlineUsers: [],

  initSocket: (userId) => {
    if (get().socket) return;

    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Connected to socket server');
      socket.emit('user:online', userId);
    });

    socket.on('users:online', (users) => {
      set({ onlineUsers: users });
    });

    socket.on('notification:new', async (notif) => {
      console.log('New notification:', notif);
      
      // Auto-read logic: if user is already on the target page, mark as read immediately
      const currentPath = window.location.pathname;
      const isTargetPage = notif.link && (
        currentPath === notif.link || 
        (notif.link.startsWith('/tickets/') && currentPath.includes(notif.link))
      );

      if (isTargetPage) {
        notif.read = true;
        // Background sync with DB
        const { notificationAPI } = await import('../services/api');
        notificationAPI.markRead(notif._id).catch(() => {});
      }

      useNotificationStore.getState().addNotification(notif);

      // ── Rich push toast for ticket assignments ──────────────────────────
      if (notif.type === 'ticket_assigned' && !isTargetPage) {
        showTicketAssignedToast(notif);
      }
    });

    socket.on('chat:newPersonalMessage', (msg) => {
      useChatStore.getState().appendMessage(msg);
    });

    socket.on('chat:messageSent', (msg) => {
      useChatStore.getState().appendMessage(msg);
    });

    socket.on('chat:newTeamMessage', (msg) => {
      useChatStore.getState().appendMessage(msg);
    });

    socket.on('chat:messageDeleted', ({ messageId }) => {
      useChatStore.getState().removeMessage(messageId);
    });

    socket.on('chat:newGroupMessage', (msg) => {
      useChatStore.getState().appendMessage(msg);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  }
}));

export default useSocketStore;
