import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';

// Layout
import AppLayout from './components/layout/AppLayout';

// Auth pages
import Login    from './pages/Login';
// import Register from './pages/Register'; // Removed for SuperAdmin-only creation

// App pages
import Dashboard     from './pages/Dashboard';
import Projects      from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import TicketDetail  from './pages/TicketDetail';
import Tickets       from './pages/Tickets';
import Users         from './pages/Users';
import Teams         from './pages/Teams';
import TeamDetail    from './pages/TeamDetail';
import Chat          from './pages/Chat';
import Settings      from './pages/Settings';
import Notifications from './pages/Notifications';

function ProtectedRoute({ children }) {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { token } = useAuthStore();
  return !token ? children : <Navigate to="/" replace />;
}

// Guard for SuperAdmin-only routes
function AdminRoute({ children }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'superadmin' ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        {/* <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} /> */}

        {/* Protected app shell */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/"element={<Dashboard />} />
          <Route path="/projects"element={<Projects />} />
          <Route path="/projects/:id"element={<ProjectDetail />} />
          <Route path="/projects/:projectId/tickets/:ticketId"element={<TicketDetail />} />
          <Route path="/tickets" element={<Navigate to="/tickets/all" replace />} />
          <Route path="/tickets/mine" element={<Tickets mode="mine" />} />
          <Route path="/tickets/all" element={<Tickets mode="all" />} />
          <Route path="/tickets/:ticketId"element={<TicketDetail />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:mode" element={<Chat />} />
          <Route path="/chat/:mode/:id"element={<Chat />} />
          <Route path="/settings"element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          {/* SuperAdmin only */}
          <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
