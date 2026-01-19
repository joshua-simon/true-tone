import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AFFILIATION_TYPES = [
  { value: 'endorsed', label: 'Endorsed by' },
  { value: 'works_for', label: 'Works for' },
  { value: 'former_employee', label: 'Former employee of' },
  { value: 'dealer', label: 'Authorized dealer for' },
];

function InviteSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get('invite');

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [tokenError, setTokenError] = useState('');

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [bio, setBio] = useState('');
  const [hasAffiliation, setHasAffiliation] = useState(false);
  const [affiliationType, setAffiliationType] = useState('');
  const [manufacturerName, setManufacturerName] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validate invitation token on mount
  useEffect(() => {
    async function validateToken() {
      if (!inviteToken) {
        setTokenError('No invitation token provided. Please use the link from your invitation.');
        setValidating(false);
        setLoading(false);
        return;
      }

      try {
        const invitationRef = doc(db, 'invitations', inviteToken);
        const invitationSnap = await getDoc(invitationRef);

        if (!invitationSnap.exists()) {
          setTokenError('This invitation link is invalid. Please contact the administrator to request a new invitation.');
          setValidating(false);
          setLoading(false);
          return;
        }

        const invitationData = invitationSnap.data();

        // Check if already used
        if (invitationData.status === 'accepted') {
          setTokenError('This invitation has already been used. Please contact the administrator if you need assistance.');
          setValidating(false);
          setLoading(false);
          return;
        }

        // Check if expired
        const expiresAt = invitationData.expiresAt?.toDate();
        if (expiresAt && expiresAt < new Date()) {
          // Mark as expired in database
          await updateDoc(invitationRef, { status: 'expired' });
          setTokenError('This invitation link has expired. Please contact the administrator to request a new invitation.');
          setValidating(false);
          setLoading(false);
          return;
        }

        // Token is valid
        setInvitation({
          id: invitationSnap.id,
          ...invitationData,
        });

        // Pre-fill name if provided
        if (invitationData.inviteeName) {
          setFullName(invitationData.inviteeName);
        }

        setValidating(false);
        setLoading(false);
      } catch (err) {
        console.error('Error validating token:', err);
        setTokenError('Failed to validate invitation. Please try again later.');
        setValidating(false);
        setLoading(false);
      }
    }

    validateToken();
  }, [inviteToken]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // Validate affiliation fields if checkbox is checked
    if (hasAffiliation) {
      if (!affiliationType) {
        setError('Please select an affiliation type.');
        return;
      }
      if (!manufacturerName.trim()) {
        setError('Please enter the manufacturer name.');
        return;
      }
    }

    setSubmitting(true);

    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        invitation.email,
        password
      );

      const user = userCredential.user;

      // Create user document in Firestore
      const userData = {
        userId: user.uid,
        role: 'reviewer',
        email: invitation.email,
        name: fullName.trim(),
        credentials: credentials.trim(),
        bio: bio.trim(),
        hasAffiliation: hasAffiliation,
        createdAt: Timestamp.now(),
      };

      if (hasAffiliation) {
        userData.affiliationType = affiliationType;
        userData.manufacturerName = manufacturerName.trim();
      }

      await setDoc(doc(db, 'users', user.uid), userData);

      // Mark invitation as accepted
      await updateDoc(doc(db, 'invitations', invitation.id), {
        status: 'accepted',
        acceptedAt: Timestamp.now(),
        acceptedBy: user.uid,
      });

      // Redirect to reviewer dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error creating account:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please log in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError('Failed to create account. Please try again.');
      }
      setSubmitting(false);
    }
  }

  // Loading state
  if (loading || validating) {
    return (
      <div className="min-h-screen bg-warm-gray flex items-center justify-center">
        <p className="text-gray-500">Validating invitation...</p>
      </div>
    );
  }

  // Error state - invalid/expired token
  if (tokenError) {
    return (
      <div className="min-h-screen bg-warm-gray flex flex-col">
        <header className="header">
          <div className="header-content">
            <Link to="/" className="header-title">
              True Tone
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="card p-8 text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto h-16 w-16 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-deep-black mb-4">Invalid Invitation</h1>
              <p className="text-gray-600 mb-6">{tokenError}</p>
              <p className="text-sm text-gray-500">
                Contact: <a href="mailto:joshy.d.simon@gmail.com" className="text-brass">joshy.d.simon@gmail.com</a>
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Valid token - show signup form
  return (
    <div className="min-h-screen bg-warm-gray flex flex-col">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="header-title">
            True Tone
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="card p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-deep-black mb-2">Create Reviewer Account</h1>
              <p className="text-gray-500 text-sm">Welcome! Complete your registration below.</p>
            </div>

            {error && (
              <div className="alert alert-error mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email (read-only) */}
              <div>
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={invitation.email}
                  readOnly
                  className="form-input"
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                />
                <p className="text-xs text-gray-500 mt-1">Email is pre-set from your invitation</p>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="form-label">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="form-input"
                  placeholder="Minimum 8 characters"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="form-input"
                  placeholder="Re-enter your password"
                />
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="form-label">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="form-input"
                  placeholder="John Smith"
                />
              </div>

              {/* Credentials */}
              <div>
                <label htmlFor="credentials" className="form-label">
                  Credentials *
                </label>
                <input
                  type="text"
                  id="credentials"
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  required
                  className="form-input"
                  placeholder="e.g., Professional saxophonist, 15 years experience"
                />
                <p className="text-xs text-gray-500 mt-1">This will be displayed on all your reviews</p>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="form-label">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="form-textarea"
                  placeholder="Tell us about yourself, your musical background, and experience with saxophones..."
                />
              </div>

              {/* Manufacturer Affiliation */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-base font-semibold text-deep-black mb-3">Manufacturer Affiliation</h3>

                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={hasAffiliation}
                    onChange={(e) => setHasAffiliation(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="text-sm text-gray-700">I am affiliated with a saxophone manufacturer</span>
                </label>

                {hasAffiliation && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <label htmlFor="affiliationType" className="form-label">
                        Affiliation Type *
                      </label>
                      <select
                        id="affiliationType"
                        value={affiliationType}
                        onChange={(e) => setAffiliationType(e.target.value)}
                        required={hasAffiliation}
                        className="form-input"
                      >
                        <option value="">Select affiliation type...</option>
                        {AFFILIATION_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="manufacturerName" className="form-label">
                        Manufacturer Name *
                      </label>
                      <input
                        type="text"
                        id="manufacturerName"
                        value={manufacturerName}
                        onChange={(e) => setManufacturerName(e.target.value)}
                        required={hasAffiliation}
                        className="form-input"
                        placeholder="e.g., Henri Selmer Paris, Yanagisawa"
                      />
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-3">
                  This information will be displayed on all your reviews for transparency.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-full"
              >
                {submitting ? 'Creating Account...' : 'Create Reviewer Account'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brass font-medium">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default InviteSignup;
