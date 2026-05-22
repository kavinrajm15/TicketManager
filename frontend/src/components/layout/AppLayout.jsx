import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import useAuthStore from "../../store/useAuthStore";
import useSocketStore from "../../store/useSocketStore";
import useNotificationStore from "../../store/useNotificationStore";

export default function AppLayout() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, refreshUser } = useAuthStore();
  const { initSocket, disconnectSocket } = useSocketStore();
  const { markByLink, clearSection, subscribeToPush } = useNotificationStore();

  useEffect(() => {
    refreshUser();
  }, []);

  // Navigation-based auto-read: per-link + section-level clearing
  useEffect(() => {
    if (!user?.userId) return;

    // Per-link clear (handles individual ticket/comment pages)
    markByLink(pathname);

    // Section-level badge clearing
    if (pathname.startsWith('/tickets')) {
      clearSection('ticket');
    } else if (pathname.startsWith('/chat/personal')) {
      clearSection('personal_chat');
    } else if (pathname.startsWith('/chat/team')) {
      clearSection('team_chat');
    }
  }, [pathname, user?.userId]);

  useEffect(() => {
    if (user?.userId) {
      initSocket(user.userId);
      subscribeToPush();
    }
    return () => disconnectSocket();
  }, [user?.userId]);

  // Close mobile menu on resize if screen becomes large
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <Topbar
        collapsed={collapsed}
        onMenuClick={() => setMobileMenuOpen(true)}
      />

      {/* Main content area */}
      <main
        className={`transition-all duration-300 pt-16 min-h-screen 
          ${collapsed ? "lg:ml-16" : "lg:ml-60"}
          ml-0
        `}
      >
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
