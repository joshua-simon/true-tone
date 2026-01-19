import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import AddReview from './AddReview';

const AFFILIATION_LABELS = {
  endorsed: 'Endorsed by',
  works_for: 'Works for',
  former_employee: 'Former employee of',
  dealer: 'Authorized dealer for',
};

const AFFILIATION_DISCLOSURES = {
  endorsed: (manufacturer) =>
    `This reviewer is endorsed by ${manufacturer} and may receive instruments and support from the company. Consider potential bias when evaluating their assessment.`,
  works_for: (manufacturer) =>
    `This reviewer works for ${manufacturer}. Consider potential bias when evaluating their assessment.`,
  former_employee: (manufacturer) =>
    `This reviewer is a former employee of ${manufacturer}. Consider potential bias when evaluating their assessment.`,
  dealer: (manufacturer) =>
    `This reviewer is an authorized dealer for ${manufacturer}. Consider potential bias when evaluating their assessment.`,
};

const RATING_CATEGORIES = {
  tonalCharacter: {
    label: 'Tonal Character',
    sliders: [
      { key: 'darkBright', leftLabel: 'Dark/Warm', rightLabel: 'Bright' },
      { key: 'centeredBroad', leftLabel: 'Centered', rightLabel: 'Broad' },
    ],
  },
  responseProjection: {
    label: 'Response & Projection',
    sliders: [
      { key: 'intimateProjecting', leftLabel: 'Intimate', rightLabel: 'Projecting' },
      { key: 'resistantFreeblowing', leftLabel: 'Resistant', rightLabel: 'Free-blowing' },
      { key: 'keyAction', leftLabel: 'Light action', rightLabel: 'Heavy action' },
    ],
  },
  buildQuality: {
    label: 'Build Quality',
    sliders: [
      { key: 'buildQuality', leftLabel: 'Low', rightLabel: 'High' },
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
        const reviewsData = await Promise.all(
          reviewsSnap.docs.map(async (reviewDoc) => {
            const reviewData = {
              id: reviewDoc.id,
              ...reviewDoc.data(),
            };

            // Fetch reviewer's user profile for affiliation info
            if (reviewData.reviewerId) {
              try {
                const userRef = doc(db, 'users', reviewData.reviewerId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  const userData = userSnap.data();
                  reviewData.reviewerName = userData.name;
                  reviewData.reviewerHasAffiliation = userData.hasAffiliation;
                  reviewData.reviewerAffiliationType = userData.affiliationType;
                  reviewData.reviewerManufacturerName = userData.manufacturerName;
                }
              } catch (err) {
                console.error('Error fetching reviewer data:', err);
              }
            }

            return reviewData;
          })
        );

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
      'darkBright', 'centeredBroad',
      'intimateProjecting', 'resistantFreeblowing', 'keyAction',
      'buildQuality',
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
              {reviews.map((review) => {
                const displayName = review.reviewerName || review.reviewerEmail || 'Anonymous';
                const hasAffiliation = review.reviewerHasAffiliation && review.reviewerAffiliationType && review.reviewerManufacturerName;
                const affiliationLabel = hasAffiliation
                  ? `${AFFILIATION_LABELS[review.reviewerAffiliationType]} ${review.reviewerManufacturerName}`
                  : null;

                return (
                <div key={review.id} className="review-card">
                  <div className="review-card-header">
                    <h3 className="review-card-author">
                      Review by {displayName}
                      {affiliationLabel && (
                        <span style={{ fontWeight: 'normal', color: '#6b7280' }}> - {affiliationLabel}</span>
                      )}
                    </h3>
                    {review.credentials && (
                      <p className="review-card-credentials">{review.credentials}</p>
                    )}
                  </div>

                  <div className="review-card-content">
                    <p className="review-card-text">{review.writtenReview}</p>
                  </div>
                </div>
                );
              })}
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
