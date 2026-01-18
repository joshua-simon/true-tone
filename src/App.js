import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Homepage from './components/Homepage';
import Login from './components/Login';
import ReviewerDashboard from './components/ReviewerDashboard';
import NewSaxophoneReview from './components/NewSaxophoneReview';
import SaxophoneDetailPage from './components/SaxophoneDetailPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />}
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
