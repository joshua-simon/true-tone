import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AFFILIATION_LABELS = {
  endorsed: 'Endorsed by',
  works_for: 'Works for',
  former_employee: 'Former employee of',
  dealer: 'Authorized dealer for',
};

function ReviewerDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!currentUser) return;

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchUserProfile();
  }, [currentUser]);

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }

  const getAffiliationDisplay = () => {
    if (!userProfile?.hasAffiliation || !userProfile?.affiliationType || !userProfile?.manufacturerName) {
      return null;
    }
    return `${AFFILIATION_LABELS[userProfile.affiliationType]} ${userProfile.manufacturerName}`;
  };

  return (
    <div className="min-h-screen bg-warm-gray">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <Link to="/" className="header-title">
            True Tone
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 sm-hidden">
              {currentUser?.email}
            </span>
            <button
              onClick={handleLogout}
              className="nav-btn-ghost"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12" style={{ maxWidth: '56rem' }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-deep-black mb-2">Reviewer Dashboard</h1>
          <p className="text-gray-500">Welcome back! Manage your saxophone reviews here.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md-grid-cols-2 gap-6 mb-12">
          <button
            onClick={() => navigate('/new-saxophone-review')}
            className="dashboard-card"
          >
            <div className="dashboard-card-icon dashboard-card-icon-brass">
              <svg className="icon text-brass" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="dashboard-card-title">
              Review a New Saxophone
            </h3>
            <p className="dashboard-card-desc">
              Add a saxophone that isn't in our database yet and be the first to review it.
            </p>
          </button>

          <Link to="/" className="dashboard-card">
            <div className="dashboard-card-icon dashboard-card-icon-dark">
              <svg className="icon text-deep-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="dashboard-card-title">
              Browse Saxophones
            </h3>
            <p className="dashboard-card-desc">
              Find an existing saxophone in our database and add your review.
            </p>
          </Link>
        </div>

        {/* Profile Section */}
        <div className="section-cream mb-8">
          <h2 className="text-lg font-semibold text-deep-black mb-4">Your Profile</h2>

          {loadingProfile ? (
            <p className="text-gray-500 text-sm">Loading profile...</p>
          ) : userProfile ? (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Name:</span>
                <p className="text-deep-black font-medium">{userProfile.name || 'Not set'}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Email:</span>
                <p className="text-deep-black">{userProfile.email}</p>
              </div>

              {userProfile.credentials && (
                <div>
                  <span className="text-sm text-gray-500">Credentials:</span>
                  <p className="text-deep-black">{userProfile.credentials}</p>
                </div>
              )}

              {userProfile.bio && (
                <div>
                  <span className="text-sm text-gray-500">Bio:</span>
                  <p className="text-deep-black">{userProfile.bio}</p>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-500">Affiliation:</span>
                {getAffiliationDisplay() ? (
                  <p className="text-deep-black">
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      background: '#FEF3C7',
                      color: '#92400E',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}>
                      {getAffiliationDisplay()}
                    </span>
                  </p>
                ) : (
                  <p className="text-gray-600">No manufacturer affiliation</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">
              Profile not found. Please contact support.
            </p>
          )}
        </div>

        {/* Stats / Info Section */}
        <div className="section-cream">
          <h2 className="text-lg font-semibold text-deep-black mb-4">Your Activity</h2>
          <p className="text-gray-600 text-sm">
            More dashboard features coming soon, including your review history and statistics.
          </p>
        </div>
      </main>
    </div>
  );
}

export default ReviewerDashboard;
