import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useChatStore from '../store/useChatStore';
import useTeamStore from '../store/useTeamStore';
import useAuthStore from '../store/useAuthStore';
import useSocketStore from '../store/useSocketStore';
import useUserStore from '../store/useUserStore';
import useNotificationStore from '../store/useNotificationStore';
import Avatar from '../components/ui/Avatar';
import { PageLoader } from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

function MessageBubble({ msg, isMe, onReply, onDelete }) {
  const replyTo = msg.replyTo;

  return (
    <div className={`group flex gap-2 items-end ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && <Avatar user={msg.sender} size="xs" className="flex-shrink-0 mb-1" />}
      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5 relative`}>
        {!isMe && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[10px] text-textMuted">{msg.sender?.name}</span>
            <span className="text-[9px] bg-gray-100 text-gray-500 px-1 rounded uppercase font-bold tracking-tighter">
              {msg.sender?.role}
            </span>
          </div>
        )}

        {/* Action Buttons (Reply/Delete) */}
        <div className={`absolute top-0 ${isMe ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
          <button 
            onClick={() => onReply(msg)}
            className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-textMuted hover:text-primary hover:bg-gray-50 transition-colors"
            title="Reply"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
          </button>
          {isMe && (
            <button 
              onClick={() => onDelete(msg._id)}
              className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-textMuted hover:text-danger hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>

        <div className={`px-4 py-2.5 text-sm leading-relaxed rounded-2xl shadow-sm ${isMe ? 'bubble-sent' : 'bubble-received'}`}>
          {/* Quoted Message */}
          {replyTo && (
            <div className={`mb-2 p-2 rounded-lg text-xs border-l-4 bg-black/5 flex flex-col gap-0.5 ${isMe ? 'border-white/40' : 'border-primary/40'}`}>
              <span className="font-bold opacity-70">{replyTo.sender?.name || 'User'}</span>
              <span className="truncate opacity-80">{replyTo.body}</span>
            </div>
          )}
          {msg.body}
        </div>
        <span className={`text-[10px] text-textMuted ${isMe ? 'mr-1' : 'ml-1'}`}>
          {fmtTime(msg.createdAt || new Date())}
        </span>
      </div>
    </div>
  );
}

function ConversationItem({ conv, active, onClick }) {
  const isPersonal = conv.type === 'personal';
  const target = conv.target;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
        active ? 'bg-primary/5 border-r-2 border-primary' : ''
      }`}
    >
      <div className="relative">
        {isPersonal ? (
          <Avatar user={target} size="sm" />
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {target?.teamName?.charAt(0).toUpperCase() || 'T'}
          </div>
        )}
        {isPersonal && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-textMain truncate">
          {isPersonal ? target?.name : target?.teamName}
        </p>
        {conv.lastMessage && (
          <p className="text-xs text-textMuted truncate">{conv.lastMessage.body}</p>
        )}
      </div>
      {!isPersonal && (
        <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
          Team
        </span>
      )}
    </button>
  );
}

export default function Chat() {
  const { mode, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const { teams, fetchTeams } = useTeamStore();
  const { users, fetchUsers } = useUserStore();
  const {
    conversations, activeConversation,
    messages, loading, replyTo,
    fetchConversations, setActiveConversation,
    setReplyTo, sendPersonalMessage, sendTeamMessage,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [tab, setTab] = useState(mode === 'team' ? 'team' : 'personal');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (mode === 'team') setTab('team');
    else if (mode === 'personal') setTab('personal');
    if (!id) setActiveConversation(null);
  }, [mode, id, setActiveConversation]);

  const { markByLink } = useNotificationStore();

  useEffect(() => {
    if (activeConversation) {
      const link = `/chat/${activeConversation.type}/${activeConversation.target.userId || activeConversation.target._id}`;
      markByLink(link);
    }
  }, [activeConversation, markByLink]);

  useEffect(() => {
    if (mode === 'personal' && users.length > 0) {
      const u = users.find(x => String(x.userId) === String(id));
      if (u) setActiveConversation({ id: `p-${u.userId}`, type: 'personal', target: u });
    } else if (mode === 'team' && teams.length > 0) {
      const t = teams.find(x => String(x._id) === String(id));
      if (t) setActiveConversation({ id: `t-${t._id}`, type: 'team', target: t });
    }
  }, [id, mode, users, teams, setActiveConversation]);

  useEffect(() => { 
    fetchConversations(); 
    fetchTeams(); 
    fetchUsers();
  }, [fetchConversations, fetchTeams, fetchUsers]);
  
  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  // Handle Socket Rooms
  useEffect(() => {
    if (!socket || !activeConversation) return;

    if (activeConversation.type === 'team') {
      socket.emit('chat:joinTeam', activeConversation.target._id);
      return () => socket.emit('chat:leaveTeam', activeConversation.target._id);
    }
  }, [socket, activeConversation]);

  // Build conversation list
  const personalConvs = conversations.map((c) => ({
    id: `p-${c.user.userId}`, type: 'personal', target: c.user, lastMessage: c.lastMessage,
  }));

  const myTeams = teams.filter(t => 
    t.members?.some(m => m.userId === user?.userId) || 
    t.teamLead?.userId === user?.userId ||
    ['superadmin', 'manager'].includes(user?.role)
  );

  const teamConvs = myTeams.map((t) => ({
    id: `t-${t._id}`, type: 'team', target: t, lastMessage: null,
  }));

  // User Search Logic
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return [];
    return users.filter(u => 
      u.userId !== user?.userId && 
      (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    ).slice(0, 5);
  }, [search, users, user?.userId]);

  const allConvs = tab === 'personal' ? personalConvs : teamConvs;

  const handleSend = async () => {
    if (!input.trim() || !activeConversation || !socket) return;
    const body = input.trim();
    const replyToId = replyTo?._id;
    setInput('');
    setReplyTo(null);

    if (activeConversation.type === 'personal') {
      socket.emit('chat:personalMessage', {
        senderId: user.userId,
        recipientId: activeConversation.target.userId,
        body,
        replyToId
      });
    } else {
      socket.emit('chat:teamMessage', {
        senderId: user.userId,
        teamId: activeConversation.target._id,
        body,
        replyToId
      });
    }
  };

  const handleDelete = (messageId) => {
    if (!socket) return;
    socket.emit('chat:deleteMessage', { messageId, userId: user.userId });
  };

  const startPersonalChat = (targetUser) => {
    setSearch('');
    setActiveConversation({
      id: `p-${targetUser.userId}`,
      type: 'personal',
      target: targetUser
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Left: conversation list */}
      <div className={`
        ${activeConversation ? 'hidden md:flex' : 'flex'}
        w-full md:w-64 flex-shrink-0 border-r border-gray-100 flex-col
      `}>
        {/* Search / User Autocomplete */}
        <div className="px-4 py-3 border-b border-gray-50 relative">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              placeholder={tab === 'personal' ? "Type name to start chat..." : "Search team chats..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* User Suggestions Dropdown */}
          {tab === 'personal' && filteredUsers.length > 0 && (
            <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
              {filteredUsers.map(u => (
                <button
                  key={u.userId}
                  onClick={() => startPersonalChat(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <Avatar user={u} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-textMain truncate">{u.name}</p>
                    <p className="text-[10px] text-textMuted truncate">{u.role}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {allConvs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                {tab === 'personal' ? '👤' : '👥'}
              </div>
              <p className="text-sm font-medium text-textMain">No {tab} chats</p>
              <p className="text-xs text-textMuted mt-1">
                {tab === 'personal' ? 'Search for a user above to start chatting' : 'You are not in any teams yet'}
              </p>
            </div>
          ) : (
            allConvs.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                active={activeConversation?.id === conv.id}
                onClick={() => setActiveConversation({ ...conv })}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: message area */}
      {activeConversation ? (
        <div className={`
          flex-1 flex flex-col min-w-0 bg-gray-50/30
          ${activeConversation ? 'flex' : 'hidden md:flex'}
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-100">
            <div className="flex items-center gap-3">
              {/* Back button for mobile */}
              <button 
                onClick={() => setActiveConversation(null)}
                className="md:hidden p-2 -ml-2 text-textMuted hover:text-textMain"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {activeConversation.type === 'personal' ? (
                <Avatar user={activeConversation.target} size="md" />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {activeConversation.target?.teamName?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-textMain truncate">
                  {activeConversation.type === 'personal' ? activeConversation.target?.name : activeConversation.target?.teamName}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-[10px] font-medium text-textMuted truncate">
                    {activeConversation.type === 'personal' ? 'Personal Chat' : `${activeConversation.target?.members?.length || 0} members`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
            {loading ? <PageLoader /> : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <div className="text-4xl mb-2">👋</div>
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.messageId || msg._id}
                  msg={msg}
                  isMe={msg.sender?.userId === user?.userId}
                  onReply={(m) => setReplyTo(m)}
                  onDelete={handleDelete}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-6 py-4 bg-white border-t border-gray-100">
            {/* Reply Preview */}
            {replyTo && (
              <div className="mb-2 bg-gray-50 border-l-4 border-primary p-3 rounded-r-xl flex items-center justify-between group animate-in slide-in-from-bottom-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-primary uppercase">Replying to {replyTo.sender?.name}</span>
                  <span className="text-xs text-textMuted truncate max-w-lg">{replyTo.body}</span>
                </div>
                <button 
                  onClick={() => setReplyTo(null)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <svg className="w-4 h-4 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            <div className="flex items-end gap-3 bg-gray-50 rounded-2xl p-1 border border-gray-100 focus-within:border-primary/30 transition-colors">
              <textarea
                id="chat-input"
                className="flex-1 text-sm bg-transparent border-none rounded-xl px-4 py-3 resize-none focus:outline-none max-h-32"
                placeholder={`Message ${activeConversation.type === 'personal' ? activeConversation.target?.name : activeConversation.target?.teamName}…`}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                id="send-message-btn"
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex-shrink-0 mb-0.5 mr-0.5"
              >
                <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-textMuted mt-2 ml-4">Press <b>Enter</b> to send, <b>Shift+Enter</b> for new line</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/20">
          <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 flex items-center justify-center mb-6 animate-bounce-slow">
            <span className="text-5xl">💬</span>
          </div>
          <h3 className="text-xl font-bold text-textMain mb-2">Your Inbox</h3>
          <p className="text-sm text-textMuted max-w-xs leading-relaxed">
            Select a personal conversation or a team channel from the sidebar to start chatting.
          </p>
        </div>
      )}
    </div>
  );
}
