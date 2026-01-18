import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ReviewRatingSliders from './ReviewRatingSliders';

function AddReview({ saxophone, onSuccess, onCancel }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReviewChange = (data) => {
    setReviewData(data);
  };

  const validateForm = () => {
    if (!reviewData?.writtenReview?.trim()) return 'Written review is required';
    if (!reviewData?.credentials?.trim()) return 'Reviewer credentials are required';
    if (reviewData?.hasConflict && !reviewData?.conflictDisclosure?.trim()) {
      return 'Please describe your conflict of interest';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create the review in the reviews subcollection
      const reviewDocument = {
        reviewerId: currentUser.uid,
        reviewerEmail: currentUser.email,
        ratings: reviewData.ratings,
        writtenReview: reviewData.writtenReview.trim(),
        credentials: reviewData.credentials.trim(),
        hasConflict: reviewData.hasConflict,
        conflictDisclosure: reviewData.hasConflict ? reviewData.conflictDisclosure.trim() : null,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'saxophones', saxophone.id, 'reviews'), reviewDocument);

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Saxophone Info Header (Read-only) */}
      <div className="add-review-header">
        <p className="add-review-label">Reviewing</p>
        <div className="add-review-content">
          {saxophone.photoURL && (
            <img
              src={saxophone.photoURL}
              alt={saxophone.model}
              className="add-review-image"
            />
          )}
          <div className="add-review-info">
            <h2 className="add-review-title">
              {saxophone.brand} {saxophone.model}
            </h2>
            <div className="add-review-meta space-y-1">
              <p><span>Type:</span> {saxophone.type}</p>
              <p><span>Year:</span> {saxophone.productionYear}</p>
              <p><span>Price Range:</span> {saxophone.priceRange}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-deep-black mb-4 pb-2" style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
            Your Review
          </h3>
          <ReviewRatingSliders
            reviewData={reviewData}
            onChange={handleReviewChange}
            userCredentials={currentUser?.displayName}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddReview;
