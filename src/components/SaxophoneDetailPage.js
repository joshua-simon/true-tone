import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import AddReview from './AddReview';

const RATING_CATEGORIES = {
  tonalCharacter: {
    label: 'Tonal Character',
    sliders: [
      { key: 'darkBright', leftLabel: 'Dark/Warm', rightLabel: 'Bright' },
      { key: 'centeredBroad', leftLabel: 'Centered', rightLabel: 'Broad' },
      { key: 'focusedDiffuse', leftLabel: 'Focused', rightLabel: 'Diffuse' },
    ],
  },
  responseProjection: {
    label: 'Response & Projection',
    sliders: [
      { key: 'intimateProjecting', leftLabel: 'Intimate', rightLabel: 'Projecting' },
      { key: 'resistantFreeblowing', leftLabel: 'Resistant', rightLabel: 'Free-blowing' },
    ],
  },
  technicalResponse: {
    label: 'Technical Response',
    sliders: [
      { key: 'altissimo', leftLabel: 'Sluggish altissimo', rightLabel: 'Easy altissimo' },
      { key: 'keywork', leftLabel: 'Heavy keywork', rightLabel: 'Light keywork' },
      { key: 'ergonomics', leftLabel: 'Uncomfortable', rightLabel: 'Ergonomic' },
    ],
  },
  buildQuality: {
    label: 'Build Quality',
    sliders: [
      { key: 'intonation', leftLabel: 'Intonation issues', rightLabel: 'Perfect intonation' },
      { key: 'qualityControl', leftLabel: 'Inconsistent QC', rightLabel: 'Reliable QC' },
    ],
  },
};

function RatingBar({ value, leftLabel, rightLabel, maxValue = 10 }) {
  const percentage = ((value - 1) / (maxValue - 1)) * 100;

  return (
    <div className="rating-display">
      <div className="rating-display-labels">
        <span className="rating-display-label">{leftLabel}</span>
        <span className="rating-display-label">{rightLabel}</span>
      </div>
      <div className="rating-display-track">
        <div
          className="rating-display-fill"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="rating-display-thumb"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
}

function RatingCategoryDisplay({ category, ratings, showLabels = true }) {
  return (
    <div className="rating-category-display">
      {showLabels && (
        <h4 className="rating-category-label">{category.label}</h4>
      )}
      {category.sliders.map((slider) => (
        <RatingBar
          key={slider.key}
          value={ratings[slider.key]}
          leftLabel={slider.leftLabel}
          rightLabel={slider.rightLabel}
        />
      ))}
    </div>
  );
}

function SaxophoneDetailPage() {
  const { saxophoneId } = useParams();
  const { currentUser } = useAuth();

  const [saxophone, setSaxophone] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddReview, setShowAddReview] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch saxophone document
        const saxophoneRef = doc(db, 'saxophones', saxophoneId);
        const saxophoneSnap = await getDoc(saxophoneRef);

        if (!saxophoneSnap.exists()) {
          setError('Saxophone not found');
          setLoading(false);
          return;
        }

        setSaxophone({ id: saxophoneSnap.id, ...saxophoneSnap.data() });

        // Fetch reviews subcollection
        const reviewsRef = collection(db, 'saxophones', saxophoneId, 'reviews');
        const reviewsSnap = await getDocs(reviewsRef);
        const reviewsData = reviewsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setReviews(reviewsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load saxophone details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [saxophoneId]);

  // Calculate aggregated ratings
  const calculateAggregatedRatings = () => {
    if (reviews.length === 0) return null;

    const ratingKeys = [
      'darkBright', 'centeredBroad', 'focusedDiffuse',
      'intimateProjecting', 'resistantFreeblowing',
      'altissimo', 'keywork', 'ergonomics',
      'intonation', 'qualityControl',
    ];

    const aggregated = {};
    ratingKeys.forEach((key) => {
      const sum = reviews.reduce((acc, review) => acc + (review.ratings?.[key] || 5), 0);
      aggregated[key] = sum / reviews.length;
    });

    return aggregated;
  };

  const handleReviewSuccess = () => {
    setShowAddReview(false);
    // Refresh reviews
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-gray flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-warm-gray p-6">
        <div className="container" style={{ maxWidth: '56rem' }}>
          <div className="alert alert-error">
            {error}
          </div>
          <Link to="/" className="text-brass">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const aggregatedRatings = calculateAggregatedRatings();

  return (
    <div className="min-h-screen bg-warm-gray">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <Link to="/" className="header-title">
            True Tone
          </Link>
          {currentUser ? (
            <Link to="/dashboard" className="header-link">
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="nav-btn">
              Reviewer Login
            </Link>
          )}
        </div>
      </header>

      <main className="container py-8" style={{ maxWidth: '56rem' }}>
        {/* Back Link */}
        <Link to="/" className="back-link">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to All Saxophones
        </Link>

        {/* Section 1: Saxophone Header */}
        <section className="sax-detail-header mb-6">
          <div className="sax-detail-layout">
            {saxophone.photoURL && (
              <div className="sax-detail-image-container">
                <img
                  src={saxophone.photoURL}
                  alt={saxophone.model}
                  className="sax-detail-image"
                />
              </div>
            )}
            <div className="sax-detail-info">
              <p className="sax-detail-type">{saxophone.type} Saxophone</p>
              <h1 className="sax-detail-title">
                {saxophone.brand} {saxophone.model}
              </h1>
              <div className="sax-detail-meta space-y-2">
                <p><span>Production Year:</span> {saxophone.productionYear}</p>
                <p><span>Price Range:</span> {saxophone.priceRange}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: What It Actually Is */}
        <section className="section-cream mb-6">
          <h2 className="text-lg font-semibold text-deep-black mb-3 pb-2" style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.3)' }}>
            What It Actually Is
          </h2>
          <p className="text-gray-700 leading-relaxed">{saxophone.description}</p>
        </section>

        {/* Section 3: Aggregated Ratings */}
        {aggregatedRatings && (
          <section className="section mb-6">
            <h2 className="section-title">
              Aggregated Ratings
            </h2>

            <div className="ratings-grid">
              {Object.entries(RATING_CATEGORIES).map(([key, category]) => (
                <RatingCategoryDisplay
                  key={key}
                  category={category}
                  ratings={aggregatedRatings}
                />
              ))}
            </div>

            <p className="stats-footer">
              Based on {reviews.length} expert review{reviews.length !== 1 ? 's' : ''}
            </p>
          </section>
        )}

        {reviews.length === 0 && (
          <section className="section mb-6 text-center">
            <p className="text-gray-500 italic">No reviews yet. Be the first to review this saxophone!</p>
          </section>
        )}

        {/* Section 4: Individual Reviews */}
        {reviews.length > 0 && (
          <section className="section mb-6">
            <h2 className="section-title">
              Individual Reviews
            </h2>

            <div className="review-list">
              {reviews.map((review) => (
                <div key={review.id} className="review-card">
                  <div className="review-card-header">
                    <h3 className="review-card-author">
                      Review by {review.reviewerEmail || 'Anonymous'}
                    </h3>
                    {review.credentials && (
                      <p className="review-card-credentials">{review.credentials}</p>
                    )}
                  </div>

                  {review.hasConflict && review.conflictDisclosure && (
                    <div className="alert alert-warning mb-4">
                      <span className="font-medium">Conflict of Interest:</span> {review.conflictDisclosure}
                    </div>
                  )}

                  <div className="ratings-grid mb-4">
                    {Object.entries(RATING_CATEGORIES).map(([key, category]) => (
                      <RatingCategoryDisplay
                        key={key}
                        category={category}
                        ratings={review.ratings}
                      />
                    ))}
                  </div>

                  <div className="review-card-content">
                    <h4 className="review-card-title">Written Review</h4>
                    <p className="review-card-text">{review.writtenReview}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 5: Add Review */}
        {currentUser && !showAddReview && (
          <div className="text-center mb-6">
            <button
              onClick={() => setShowAddReview(true)}
              className="btn btn-primary btn-lg"
            >
              Add Your Review
            </button>
          </div>
        )}

        {showAddReview && (
          <section className="section mb-6">
            <h2 className="section-title">
              Add Your Review
            </h2>
            <AddReview
              saxophone={saxophone}
              onSuccess={handleReviewSuccess}
              onCancel={() => setShowAddReview(false)}
            />
          </section>
        )}

        {!currentUser && (
          <div className="text-center mb-6">
            <p className="text-gray-500 text-sm">
              <Link to="/login" className="text-brass font-medium">
                Log in
              </Link>
              {' '}to add your review
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2024 True Tone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default SaxophoneDetailPage;
