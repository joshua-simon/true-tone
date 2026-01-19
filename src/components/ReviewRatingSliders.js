import { useState, useEffect } from 'react';

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

function ReviewRatingSliders({ reviewData, onChange }) {
  const [ratings, setRatings] = useState(reviewData?.ratings || {
    darkBright: 5,
    centeredBroad: 5,
    intimateProjecting: 5,
    resistantFreeblowing: 5,
    keyAction: 5,
    buildQuality: 5,
  });
  const [writtenReview, setWrittenReview] = useState(reviewData?.writtenReview || '');

  useEffect(() => {
    onChange({
      ratings,
      writtenReview,
    });
  }, [ratings, writtenReview]);

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
    </div>
  );
}

export default ReviewRatingSliders;
