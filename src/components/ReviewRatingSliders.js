import { useState, useEffect } from 'react';

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

function RatingSlider({ sliderKey, leftLabel, rightLabel, value, onChange }) {
  const percentage = ((value - 1) / 9) * 100;

  return (
    <div className="rating-slider-container">
      <div className="rating-slider-labels">
        <span className="rating-slider-label">{leftLabel}</span>
        <span className="rating-slider-label">{rightLabel}</span>
      </div>
      <div className="relative">
        <div className="rating-slider-track">
          <div
            className="rating-slider-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(sliderKey, parseInt(e.target.value))}
          className="rating-slider-input"
        />
        <div
          className="rating-slider-thumb"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
      <div className="rating-slider-value">
        <span>{value}</span>
      </div>
    </div>
  );
}

function ReviewRatingSliders({ reviewData, onChange, userCredentials }) {
  const [ratings, setRatings] = useState(reviewData?.ratings || {
    darkBright: 5,
    centeredBroad: 5,
    focusedDiffuse: 5,
    intimateProjecting: 5,
    resistantFreeblowing: 5,
    altissimo: 5,
    keywork: 5,
    ergonomics: 5,
    intonation: 5,
    qualityControl: 5,
  });
  const [writtenReview, setWrittenReview] = useState(reviewData?.writtenReview || '');
  const [credentials, setCredentials] = useState(reviewData?.credentials || userCredentials || '');
  const [hasConflict, setHasConflict] = useState(reviewData?.hasConflict || false);
  const [conflictDisclosure, setConflictDisclosure] = useState(reviewData?.conflictDisclosure || '');

  useEffect(() => {
    onChange({
      ratings,
      writtenReview,
      credentials,
      hasConflict,
      conflictDisclosure,
    });
  }, [ratings, writtenReview, credentials, hasConflict, conflictDisclosure]);

  const handleRatingChange = (key, value) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {Object.entries(RATING_CATEGORIES).map(([categoryKey, category]) => (
        <div key={categoryKey} className="rating-category">
          <h3 className="rating-category-title">
            {category.label}
          </h3>
          {category.sliders.map((slider) => (
            <RatingSlider
              key={slider.key}
              sliderKey={slider.key}
              leftLabel={slider.leftLabel}
              rightLabel={slider.rightLabel}
              value={ratings[slider.key]}
              onChange={handleRatingChange}
            />
          ))}
        </div>
      ))}

      {/* Written Review */}
      <div>
        <h3 className="text-base font-semibold text-deep-black mb-3">Written Review *</h3>
        <textarea
          value={writtenReview}
          onChange={(e) => setWrittenReview(e.target.value)}
          placeholder="Share your detailed thoughts about this saxophone..."
          rows={6}
          className="form-textarea"
        />
      </div>

      {/* Credentials */}
      <div>
        <h3 className="text-base font-semibold text-deep-black mb-3">Your Credentials *</h3>
        <input
          type="text"
          value={credentials}
          onChange={(e) => setCredentials(e.target.value)}
          placeholder="e.g., Professional saxophonist, 15 years experience"
          className="form-input"
        />
      </div>

      {/* Conflicts of Interest */}
      <div className="conflicts-section">
        <h3 className="conflicts-title">Conflicts of Interest</h3>
        <label className="conflicts-checkbox-label">
          <input
            type="checkbox"
            checked={hasConflict}
            onChange={(e) => setHasConflict(e.target.checked)}
            className="form-checkbox"
          />
          <span className="conflicts-checkbox-text">I have a potential conflict of interest to disclose</span>
        </label>
        {hasConflict && (
          <textarea
            value={conflictDisclosure}
            onChange={(e) => setConflictDisclosure(e.target.value)}
            placeholder="Please describe your conflict of interest (e.g., sponsored by manufacturer, received free instrument, etc.)"
            rows={3}
            className="conflicts-textarea"
          />
        )}
      </div>
    </div>
  );
}

export default ReviewRatingSliders;
