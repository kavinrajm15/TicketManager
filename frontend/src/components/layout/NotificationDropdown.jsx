import { useNavigate } from 'react-router-dom';
import useNotificationStore from '../../store/useNotificationStore';
import Avatar from '../ui/Avatar';

const fmtDate = (d) => {
  const now = new Date();
  const date = new Date(d);
  const diff = now - date;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
};

export default function NotificationDropdown({ onClose }) {
  const { notifications, markAsRead, markAllAsRead, loading } = useNotificationStore();
  const navigate = useNavigate();

  const handleNotifClick = async (n) => {
    if (!n.read) await markAsRead(n.notificationId);
    if (n.link) navigate(n.link);
    onClose();
  };

  return (
    <div className="absolute -right-2 sm:right-0 top-full mt-2 w-[280px] sm:w-80 max-w-[calc(100vw-1rem)] bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 className="text-sm font-bold text-textMain">Notifications</h3>
        <button 
          onClick={markAllAsRead}
          className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
        >
          Mark all as read
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-textMuted">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-xs text-textMuted">No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 5).map((n) => (
            <button
              key={n.notificationId}
              onClick={() => handleNotifClick(n)}
              className={`w-full flex gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!n.read ? 'bg-primary/5' : ''}`}
            >
              <Avatar user={n.sender} size="xs" className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-relaxed ${!n.read ? 'font-semibold text-textMain' : 'text-textMuted'}`}>
                  {n.message}
                </p>
                <span className="text-[10px] text-textMuted mt-1 block">
                  {fmtDate(n.createdAt)}
                </span>
              </div>
              {!n.read && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />}
            </button>
          ))
        )}
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
        <button 
          onClick={() => { navigate('/notifications'); onClose(); }}
          className="text-[10px] font-bold text-textMuted hover:text-primary transition-colors uppercase tracking-wider"
        >
          View all history
        </button>
      </div>
    </div>
  );
}
