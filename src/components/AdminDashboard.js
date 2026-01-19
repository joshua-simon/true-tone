import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';

const ADMIN_EMAIL = 'joshy.d.simon@gmail.com';

function AdminDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [signupUrl, setSignupUrl] = useState('');
  const [error, setError] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [copied, setCopied] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (currentUser && currentUser.email !== ADMIN_EMAIL) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Fetch invitations
  useEffect(() => {
    async function fetchInvitations() {
      try {
        const invitationsRef = collection(db, 'invitations');
        const q = query(invitationsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const invitationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          expiresAt: doc.data().expiresAt?.toDate(),
        }));

        // Check and update expired invitations
        const now = new Date();
        for (const inv of invitationsData) {
          if (inv.status === 'pending' && inv.expiresAt && inv.expiresAt < now) {
            // Mark as expired in Firestore
            await updateDoc(doc(db, 'invitations', inv.id), {
              status: 'expired'
            });
            inv.status = 'expired';
          }
        }

        setInvitations(invitationsData);
      } catch (err) {
        console.error('Error fetching invitations:', err);
      } finally {
        setLoadingInvitations(false);
      }
    }

    if (currentUser?.email === ADMIN_EMAIL) {
      fetchInvitations();
    }
  }, [currentUser]);

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }

  async function handleSendInvitation(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setSignupUrl('');
    setSending(true);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError('Please enter a valid email address.');
      setSending(false);
      return;
    }

    // Check if email already has a pending invitation
    const existingPending = invitations.find(
      inv => inv.email === inviteEmail && inv.status === 'pending'
    );
    if (existingPending) {
      setError('This email already has a pending invitation.');
      setSending(false);
      return;
    }

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitationData = {
        email: inviteEmail,
        inviteeName: inviteeName || null,
        customMessage: customMessage || null,
        status: 'pending',
        invitedBy: ADMIN_EMAIL,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
      };

      const docRef = await addDoc(collection(db, 'invitations'), invitationData);

      const url = `${window.location.origin}/signup?invite=${docRef.id}`;
      setSignupUrl(url);
      setSuccessMessage(`Invitation created for ${inviteEmail}!`);

      // Add to local list
      setInvitations(prev => [{
        id: docRef.id,
        ...invitationData,
        createdAt: now,
        expiresAt: expiresAt,
      }, ...prev]);

      // Clear form
      setInviteEmail('');
      setInviteeName('');
      setCustomMessage('');
    } catch (err) {
      console.error('Error creating invitation:', err);
      setError('Failed to create invitation. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleResendInvitation(invitation) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await updateDoc(doc(db, 'invitations', invitation.id), {
        status: 'pending',
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
      });

      // Update local state
      setInvitations(prev => prev.map(inv =>
        inv.id === invitation.id
          ? { ...inv, status: 'pending', createdAt: now, expiresAt: expiresAt }
          : inv
      ));

      const url = `${window.location.origin}/signup?invite=${invitation.id}`;
      setSignupUrl(url);
      setSuccessMessage(`Invitation resent to ${invitation.email}!`);
    } catch (err) {
      console.error('Error resending invitation:', err);
      setError('Failed to resend invitation.');
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function getStatusBadge(status) {
    const styles = {
      pending: { background: '#FEF3C7', color: '#92400E' },
      accepted: { background: '#D1FAE5', color: '#065F46' },
      expired: { background: '#FEE2E2', color: '#991B1B' },
    };
    return styles[status] || styles.pending;
  }

  function formatDate(date) {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-warm-gray flex items-center justify-center">
        <p className="text-gray-500">Access denied. Admin only.</p>
      </div>
    );
  }

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
              Admin
            </span>
            <Link to="/" className="nav-btn-ghost">
              Home
            </Link>
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
          <h1 className="text-3xl font-bold text-deep-black mb-2">Admin Dashboard</h1>
          <p className="text-gray-500">Manage reviewer invitations</p>
        </div>

        {/* Send Invitation Form */}
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-deep-black mb-4">Send Invitation</h2>

          {error && (
            <div className="alert alert-error mb-4">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success mb-4">
              {successMessage}
            </div>
          )}

          {signupUrl && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">Share this signup link:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={signupUrl}
                  readOnly
                  className="form-input flex-1 text-sm"
                  style={{ fontFamily: 'monospace' }}
                />
                <button
                  onClick={() => copyToClipboard(signupUrl)}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendInvitation} className="space-y-4">
            <div>
              <label htmlFor="inviteEmail" className="form-label">
                Email Address *
              </label>
              <input
                type="email"
                id="inviteEmail"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="form-input"
                placeholder="reviewer@example.com"
              />
            </div>

            <div>
              <label htmlFor="inviteeName" className="form-label">
                Invitee Name (optional)
              </label>
              <input
                type="text"
                id="inviteeName"
                value={inviteeName}
                onChange={(e) => setInviteeName(e.target.value)}
                className="form-input"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label htmlFor="customMessage" className="form-label">
                Custom Message (optional)
              </label>
              <textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="form-textarea"
                rows={3}
                placeholder="Add a personal note to the invitation..."
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="btn btn-primary"
            >
              {sending ? 'Creating Invitation...' : 'Send Invitation'}
            </button>
          </form>
        </div>

        {/* Invitations List */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-deep-black mb-4">Sent Invitations</h2>

          {loadingInvitations ? (
            <p className="text-gray-500">Loading invitations...</p>
          ) : invitations.length === 0 ? (
            <p className="text-gray-500">No invitations sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Sent</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Expires</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>{invitation.email}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          ...getStatusBadge(invitation.status)
                        }}>
                          {invitation.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', color: '#6b7280' }}>
                        {formatDate(invitation.createdAt)}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', color: '#6b7280' }}>
                        {formatDate(invitation.expiresAt)}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {invitation.status === 'pending' && (
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/signup?invite=${invitation.id}`)}
                            className="text-sm text-brass hover:underline"
                            style={{ marginRight: '8px' }}
                          >
                            Copy Link
                          </button>
                        )}
                        {invitation.status === 'expired' && (
                          <button
                            onClick={() => handleResendInvitation(invitation)}
                            className="text-sm text-brass hover:underline"
                          >
                            Resend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
