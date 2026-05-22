import { create } from "zustand";
import { notificationAPI } from "../services/api";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  ticketUnreadCount: 0,
  chatUnreadCount: 0,
  personalChatUnreadCount: 0,
  teamChatUnreadCount: 0,
  loading: false,

  fetchNotifications: async (page = 1, limit = 50) => {
    set({ loading: true });
    try {
      const { data } = await notificationAPI.getAll({ page, limit });
      const ticketCount = data.notifications.filter(
        (n) =>
          !n.read &&
          ["mention", "ticket_assigned", "ticket_update"].includes(n.type),
      ).length;
      const personalCount = data.notifications.filter(
        (n) => !n.read && n.type === "personal_chat",
      ).length;
      const teamCount = data.notifications.filter(
        (n) => !n.read && n.type === "team_chat",
      ).length;

      set({
        notifications: data.notifications,
        unreadCount: data.unreadCount,
        ticketUnreadCount: ticketCount,
        personalChatUnreadCount: personalCount,
        teamChatUnreadCount: teamCount,
        chatUnreadCount: personalCount + teamCount,
        loading: false,
      });
      return data.notifications;
    } catch (err) {
      set({ loading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      const notification = get().notifications.find(
        (n) => n.notificationId === id,
      );
      if (!notification || notification.read) return;

      await notificationAPI.markRead(id);

      const isTicket = ["mention", "ticket_assigned", "ticket_update"].includes(
        notification.type,
      );
      const isPersonal = notification.type === "personal_chat";
      const isTeam = notification.type === "team_chat";

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.notificationId === id ? { ...n, read: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        ticketUnreadCount: isTicket
          ? Math.max(0, state.ticketUnreadCount - 1)
          : state.ticketUnreadCount,
        personalChatUnreadCount: isPersonal
          ? Math.max(0, state.personalChatUnreadCount - 1)
          : state.personalChatUnreadCount,
        teamChatUnreadCount: isTeam
          ? Math.max(0, state.teamChatUnreadCount - 1)
          : state.teamChatUnreadCount,
        chatUnreadCount:
          isPersonal || isTeam
            ? Math.max(0, state.chatUnreadCount - 1)
            : state.chatUnreadCount,
      }));
    } catch (err) {
      // silent
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationAPI.markAllRead();
      set({
        notifications: get().notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
        ticketUnreadCount: 0,
        chatUnreadCount: 0,
        personalChatUnreadCount: 0,
        teamChatUnreadCount: 0,
      });
    } catch (err) {
      // silent
    }
  },

  addNotification: (notification) => {
    set((state) => {
      // If notification is already marked as read (auto-read logic in useSocketStore), don't increment counts
      if (notification.read) {
        return {
          notifications: [notification, ...state.notifications].slice(0, 50),
        };
      }

      const isTicket = ["mention", "ticket_assigned", "ticket_update"].includes(
        notification.type,
      );
      const isPersonal = notification.type === "personal_chat";
      const isTeam = notification.type === "team_chat";

      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
        ticketUnreadCount: isTicket
          ? state.ticketUnreadCount + 1
          : state.ticketUnreadCount,
        personalChatUnreadCount: isPersonal
          ? state.personalChatUnreadCount + 1
          : state.personalChatUnreadCount,
        teamChatUnreadCount: isTeam
          ? state.teamChatUnreadCount + 1
          : state.teamChatUnreadCount,
        chatUnreadCount:
          isPersonal || isTeam
            ? state.chatUnreadCount + 1
            : state.chatUnreadCount,
      };
    });
  },

  markByLink: async (link) => {
    const unread = get().notifications.filter((n) => {
      if (n.read) return false;
      if (n.link === link) return true;
      // Handle ticket link mismatch (global vs project-specific)
      if (n.link?.startsWith("/tickets/") && link?.endsWith(n.link)) return true;
      if (n.link?.startsWith("/tickets/") && link?.includes(n.link)) return true;
      return false;
    });

    if (unread.length === 0) return;

    for (const n of unread) {
      await get().markAsRead(n.notificationId);
    }
  },

  // Instantly zero the badge count for a section when the user navigates there.
  // Does NOT mark DB records as read — just silences the sidebar badge.
  clearSection: (section) => {
    set((state) => {
      if (section === 'ticket') {
        return {
          ticketUnreadCount: 0,
          unreadCount: Math.max(0, state.unreadCount - state.ticketUnreadCount),
        };
      }
      if (section === 'personal_chat') {
        return {
          personalChatUnreadCount: 0,
          chatUnreadCount: Math.max(0, state.chatUnreadCount - state.personalChatUnreadCount),
          unreadCount: Math.max(0, state.unreadCount - state.personalChatUnreadCount),
        };
      }
      if (section === 'team_chat') {
        return {
          teamChatUnreadCount: 0,
          chatUnreadCount: Math.max(0, state.chatUnreadCount - state.teamChatUnreadCount),
          unreadCount: Math.max(0, state.unreadCount - state.teamChatUnreadCount),
        };
      }
      return {};
    });
  },

  subscribeToPush: async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const permission = await window.Notification.requestPermission();
        if (permission === 'granted') {
          const registration = await navigator.serviceWorker.register('/sw.js');
          
          const { data } = await notificationAPI.getVapidPublicKey();
          const publicVapidKey = data.publicKey;
          
          const padding = '='.repeat((4 - publicVapidKey.length % 4) % 4);
          const base64 = (publicVapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: outputArray
          });

          await notificationAPI.subscribePush(subscription);
        }
      } catch (err) {
        console.error('Error subscribing to web push:', err);
      }
    }
  },
}));

export default useNotificationStore;
