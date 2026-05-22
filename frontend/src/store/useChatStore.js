import { create } from 'zustand';
import { chatAPI } from '../services/api';
import toast from 'react-hot-toast';

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null, 
  messages: [],
  loading: false,
  replyTo: null, 

  setReplyTo: (msg) => set({ replyTo: msg }),

  setActiveConversation: (conversation) => {
    set({ activeConversation: conversation, messages: [], replyTo: null });
    if (conversation) {
      if (conversation.type === 'personal') {
        get().fetchPersonalMessages(conversation.target.userId);
      } else if (conversation.type === 'team') {
        get().fetchTeamMessages(conversation.target._id);
      }
    }
  },

  fetchConversations: async () => {
    try {
      const { data } = await chatAPI.getConversations();
      set({ conversations: data.conversations });
    } catch {
      // silent
    }
  },

  fetchPersonalMessages: async (userId) => {
    set({ loading: true });
    try {
      const { data } = await chatAPI.getPersonal(userId);
      set({ messages: data.messages, loading: false });
    } catch {
      set({ loading: false });
    }
  },


  fetchTeamMessages: async (teamId) => {
    set({ loading: true });
    try {
      const { data } = await chatAPI.getTeam(teamId);
      set({ messages: data.messages, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  sendPersonalMessage: async (userId, body) => {
    try {
      const { data } = await chatAPI.sendPersonal(userId, { body });
      set((state) => ({ messages: [...state.messages, data.message] }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    }
  },


  sendTeamMessage: async (teamId, body) => {
    try {
      const { data } = await chatAPI.sendTeam(teamId, { body });
      set((state) => ({ messages: [...state.messages, data.message] }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    }
  },

  // Called by Socket.io listener to append incoming messages
  appendMessage: (message) => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    let belongs = false;
    if (message.type === 'personal' && activeConversation.type === 'personal') {
      const targetUserId = activeConversation.target.userId;
      belongs = (message.sender.userId === targetUserId || message.recipient.userId === targetUserId);
    } else if (message.type === 'team' && activeConversation.type === 'team') {
      belongs = (message.team === activeConversation.target._id || message.team?._id === activeConversation.target._id);
    }

    if (belongs) {
      set((state) => {
        const exists = state.messages.some(m => (m._id === message._id) || (m.messageId && m.messageId === message.messageId));
        if (exists) return state;
        return { messages: [...state.messages, message] };
      });
    }
    
    // Also refresh conversations list to update last message preview
    get().fetchConversations();
  },

  removeMessage: (messageId) => {
    set((state) => ({ messages: state.messages.filter(m => m._id !== messageId) }));
  },
}));

export default useChatStore;
