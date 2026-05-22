import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useNotificationStore from "../store/useNotificationStore";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import { PageLoader } from "../components/ui/Spinner";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

export default function Notifications() {
  const navigate = useNavigate();
  const { 
    notifications, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead, 
    loading 
  } = useNotificationStore();

  const [page, setPage] = useState(1);
  const limit = 10;

  // Clear all unread counts immediately when this page is open
  useEffect(() => {
    markAllAsRead();
  }, []);

  useEffect(() => {
    fetchNotifications(page, limit);
  }, [page]);

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif._id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    toast.success("All notifications marked as read");
  };

  // Pagination helper
  const total = notifications.length; // This is a simplification, store should ideally provide total
  const hasMore = notifications.length === limit; 

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Fixed Back Button & Header */}
      <div className="sticky top-16 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-4 bg-background/80 backdrop-blur-md z-20 border-b border-gray-100/50 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-textMuted hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm group"
              title="Back"
            >
              <svg
                className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-textMain">Notifications</h1>
          </div>
          <button
            onClick={handleMarkAll}
            className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            Mark all as read
          </button>
        </div>
      </div>

      {loading && page === 1 ? (
        <PageLoader />
      ) : notifications.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-textMain">No notifications yet</h3>
          <p className="text-xs text-textMuted mt-1">We'll let you know when something happens.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => handleNotificationClick(notif)}
              className={`
                group relative p-4 rounded-xl border transition-all cursor-pointer
                ${notif.read 
                  ? 'bg-white border-gray-100 hover:border-gray-200' 
                  : 'bg-primary/5 border-primary/10 hover:bg-primary/10 hover:border-primary/20'}
              `}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Avatar user={notif.sender} size="md" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${notif.read ? 'text-textMain' : 'text-textMain font-semibold'}`}>
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-textMuted whitespace-nowrap mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {notif.type === 'mention' && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100">
                      @ Mention
                    </span>
                  )}
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 pt-6">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-xs font-medium text-textMuted">Page {page}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasMore}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
