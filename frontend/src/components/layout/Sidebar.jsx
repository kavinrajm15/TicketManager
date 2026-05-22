import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import useNotificationStore from "../../store/useNotificationStore";
import Avatar from "../ui/Avatar";

const NAV = [
  {
    to: "/",
    label: "Dashboard",
    exact: true,
    icon: (
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
          d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75a.75.75 0 01-.75-.75v-6h-6v6a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z"
        />
      </svg>
    ),
  },
  {
    to: "/projects",
    label: "Projects",
    icon: (
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
          d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
        />
      </svg>
    ),
  },
  {
    label: "Tickets",
    badge: "ticketUnreadCount",
    icon: (
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
          d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"
        />
      </svg>
    ),
    children: [
      { to: "/tickets/mine", label: "My Tickets" },
      { to: "/tickets/all", label: "All Tickets" },
    ],
  },
  {
    label: "Chat",
    icon: (
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
          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
        />
      </svg>
    ),
    children: [
      { to: "/chat/personal", label: "User Chat" },
      { to: "/chat/team", label: "Team Chat" },
    ],
  },
  {
    to: "/teams",
    label: "Teams",
    icon: (
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
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        />
      </svg>
    ),
  },
];

const USERS_NAV = {
  to: "/users",
  label: "Users",
  icon: (
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
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  ),
};

const NOTIFICATIONS_NAV = {
  to: "/notifications",
  label: "Notifications",
  icon: (
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
  ),
};

const SETTINGS_NAV = {
  to: "/settings",
  label: "Settings",
  icon: (
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
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
};

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}) {
  const { user, logout } = useAuthStore();
  const {
    unreadCount,
    ticketUnreadCount,
    chatUnreadCount,
    personalChatUnreadCount,
    teamChatUnreadCount,
  } = useNotificationStore();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith("/chat")) {
      setChatOpen(true);
    }
    if (location.pathname.startsWith("/tickets")) {
      setTicketsOpen(true);
    }
  }, [location.pathname]);

  // Close mobile menu when navigating
  useEffect(() => {
    onCloseMobile?.();
  }, [location.pathname]);

  const navItems =
    user?.role === "superadmin"
      ? [...NAV, USERS_NAV, SETTINGS_NAV]
      : [...NAV, SETTINGS_NAV];

  const isActive = (to) => {
    if (!to) return false;
    if (to === "/") return location.pathname === "/";
    if (location.pathname.startsWith("/tickets")) return to === "/tickets";
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  return (
    <aside
      className={`
      fixed left-0 top-0 h-[100dvh] bg-white border-r border-gray-100 shadow-sm z-50
      flex flex-col transition-all duration-300
      ${collapsed ? "lg:w-16" : "lg:w-60"}
      w-64
      ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
    `}
    >
      <div
        className={`flex items-center h-16 border-b border-gray-100 px-4 ${collapsed ? "justify-center" : "gap-3"}`}
      >
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
            <rect x="3" y="5" width="7" height="22" rx="2" fill="white" />
            <rect
              x="13"
              y="5"
              width="7"
              height="15"
              rx="2"
              fill="white"
              opacity="0.85"
            />
            <rect
              x="23"
              y="5"
              width="6"
              height="18"
              rx="2"
              fill="white"
              opacity="0.7"
            />
          </svg>
        </div>
        {!collapsed && (
          <span className="font-bold text-textMain text-base tracking-tight">
            Project Manager
          </span>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const active =
            isActive(item.to) ||
            (hasChildren && item.label === "Chat" && location.pathname.startsWith("/chat")) ||
            (hasChildren && item.label === "Tickets" && location.pathname.startsWith("/tickets"));

          const isOpen = item.label === "Chat" ? chatOpen : item.label === "Tickets" ? ticketsOpen : false;
          const toggleOpen = item.label === "Chat" ? () => setChatOpen(!chatOpen) : item.label === "Tickets" ? () => setTicketsOpen(!ticketsOpen) : null;

          return (
            <div key={item.label}>
              {hasChildren ? (
                <>
                  <button
                    onClick={toggleOpen}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-150
                      ${active ? "bg-primary/10 text-primary" : "text-textMuted hover:bg-gray-50 hover:text-textMain"}
                      ${collapsed ? "justify-center" : ""}
                    `}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <span className="flex-1 flex items-center justify-between">
                        <span>{item.label}</span>
                        <div className="flex items-center gap-2">
                          {item.label === "Chat" && chatUnreadCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-danger text-white text-[10px] font-bold rounded-full">
                              {chatUnreadCount}
                            </span>
                          )}
                          {item.label === "Tickets" && ticketUnreadCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-danger text-white text-[10px] font-bold rounded-full">
                              {ticketUnreadCount}
                            </span>
                          )}
                          <svg
                            className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </span>
                    )}
                  </button>
                  {isOpen && !collapsed && (
                    <div className="mt-1 ml-9 space-y-1">
                      {item.children.map((child) => {
                        const count =
                          child.label === 'User Chat'
                            ? personalChatUnreadCount
                            : child.label === 'Team Chat'
                              ? teamChatUnreadCount
                              : child.label === 'My Tickets' || child.label === 'All Tickets'
                                ? ticketUnreadCount
                                : 0;
                        return (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive: childActive }) => `
                              flex items-center justify-between py-2 px-3 text-xs font-medium rounded-md transition-colors
                              ${childActive ? 'text-primary bg-primary/5' : 'text-textMuted hover:text-textMain hover:bg-gray-50'}
                            `}
                          >
                            <span>{child.label}</span>
                            {count > 0 && (
                              <span className="px-1.5 py-0.5 bg-danger text-white text-[9px] font-bold rounded-full">
                                {count}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.to}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-150
                    ${active ? "bg-primary/10 text-primary" : "text-textMuted hover:bg-gray-50 hover:text-textMain"}
                    ${collapsed ? "justify-center" : ""}
                  `}
                  title={collapsed ? item.label : ""}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <span className="flex-1 flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.label === "Notifications" && unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-danger text-white text-[10px] font-bold rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </span>
                  )}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      <div
        className={`border-t border-gray-100 p-3 ${collapsed ? "flex justify-center" : ""}`}
      >
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <Avatar user={user} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-textMain truncate">
                {user?.name}
              </p>
              <p className="text-xs text-textMuted capitalize">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-textMuted hover:bg-red-50 hover:text-danger"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-textMuted hover:bg-red-50 hover:text-danger"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
          </button>
        )}
      </div>

      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm hidden lg:flex items-center justify-center text-textMuted hover:text-primary transition-colors z-50"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
    </aside>
  );
}
