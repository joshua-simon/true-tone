import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Homepage from './components/Homepage';
import Login from './components/Login';
import ReviewerDashboard from './components/ReviewerDashboard';
import NewSaxophoneReview from './components/NewSaxophoneReview';
import SaxophoneDetailPage from './components/SaxophoneDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './components/AdminDashboard';
import InviteSignup from './components/InviteSignup';

const ADMIN_EMAIL = 'joshy.d.simon@gmail.com';

function App() {
  const { currentUser } = useAuth();

  // Determine where to redirect logged-in users
  const getRedirectPath = () => {
    if (currentUser?.email === ADMIN_EMAIL) {
      return '/admin';
    }
    return '/dashboard';
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <Navigate to={getRedirectPath()} replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={currentUser ? <Navigate to={getRedirectPath()} replace /> : <InviteSignup />}
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ReviewerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/new-saxophone-review"
        element={
          <ProtectedRoute>
            <NewSaxophoneReview />
          </ProtectedRoute>
        }
      />
      <Route path="/saxophone/:saxophoneId" element={<SaxophoneDetailPage />} />
      <Route path="/" element={<Homepage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
