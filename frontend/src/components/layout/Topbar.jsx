import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import useNotificationStore from "../../store/useNotificationStore";
import Avatar from "../ui/Avatar";
import NotificationDropdown from "./NotificationDropdown";
import { showTicketAssignedToast } from "../ui/TicketAssignedToast";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/tickets": "Tickets",
  "/chat": "Chat",
  "/settings": "Settings",
  "/teams": "Teams",
};

const getTitle = (pathname) => {
  if (pathname.startsWith("/projects/") && pathname.includes("/tickets/"))
    return "Ticket Detail";
  if (pathname.startsWith("/projects/")) return "Project Detail";
  return PAGE_TITLES[pathname] || "Project Manager";
};

export default function Topbar({ collapsed, onMenuClick }) {
  const { user } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications } =
    useNotificationStore();
  const { pathname } = useLocation();
  const title = getTitle(pathname);
  const [showNotifs, setShowNotifs] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications().then((fetchedNotifs) => {
      if (fetchedNotifs) {
        const currentPath = window.location.pathname;
        const unreadAssignments = fetchedNotifs.filter(n => n.type === 'ticket_assigned' && !n.read);
        
        unreadAssignments.forEach(notif => {
          const isTargetPage = notif.link && (
            currentPath === notif.link || 
            (notif.link.startsWith('/tickets/') && currentPath.includes(notif.link))
          );
          if (!isTargetPage) {
            showTicketAssignedToast(notif);
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      className={`
      fixed top-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30
      flex items-center justify-between px-4 md:px-6 gap-4
      transition-all duration-300
      ${collapsed ? "lg:left-16" : "lg:left-60"}
      left-0
    `}
    >
      {/* Left section with menu and title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-textMuted hover:text-textMain hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </button>
        <h1 className="text-base md:text-lg font-bold text-textMain truncate max-w-[150px] sm:max-w-none">
          {title}
        </h1>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="notification-bell"
            onClick={() => setShowNotifs(!showNotifs)}
            className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${showNotifs ? "bg-primary/10 text-primary" : "text-textMuted hover:bg-gray-100"}`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <NotificationDropdown onClose={() => setShowNotifs(false)} />
          )}
        </div>

        {/* Avatar */}
        <Avatar user={user} size="sm" />
      </div>
    </header>
  );
}
