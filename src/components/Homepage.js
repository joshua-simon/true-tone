import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const SAXOPHONE_TYPES = ['All', 'Soprano', 'Alto', 'Tenor', 'Baritone'];
const PRICE_RANGES = [
  { label: 'All Prices', value: 'all' },
  { label: 'Under $2k', value: 'under2k' },
  { label: '$2k - $4k', value: '2k-4k' },
  { label: '$4k - $6k', value: '4k-6k' },
  { label: '$6k+', value: '6k+' },
];

function parsePriceRange(priceString) {
  if (!priceString) return 0;
  const numbers = priceString.match(/[\d,]+/g);
  if (!numbers || numbers.length === 0) return 0;
  const firstNumber = parseInt(numbers[0].replace(/,/g, ''));
  return firstNumber;
}

function matchesPriceFilter(priceString, filter) {
  if (filter === 'all') return true;
  const price = parsePriceRange(priceString);
  switch (filter) {
    case 'under2k': return price < 2000;
    case '2k-4k': return price >= 2000 && price < 4000;
    case '4k-6k': return price >= 4000 && price < 6000;
    case '6k+': return price >= 6000;
    default: return true;
  }
}

function RatingBar({ value, maxValue = 10 }) {
  const percentage = ((value - 1) / (maxValue - 1)) * 100;
  return (
    <div className="rating-bar">
      <div
        className="rating-bar-fill"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function SaxophoneCard({ saxophone }) {
  return (
    <Link to={`/saxophone/${saxophone.id}`} className="sax-card">
      <div className="sax-card-image">
        {saxophone.photoURL ? (
          <img
            src={saxophone.photoURL}
            alt={saxophone.model}
          />
        ) : (
          <div className="sax-card-placeholder">
            No Image
          </div>
        )}
      </div>
      <div className="sax-card-content">
        <p className="sax-card-brand">{saxophone.brand}</p>
        <h3 className="sax-card-model">{saxophone.model}</h3>
        <p className="sax-card-year">{saxophone.productionYear}</p>
        <div className="sax-card-footer">
          <span className="sax-card-reviews">
            {saxophone.reviewCount} review{saxophone.reviewCount !== 1 ? 's' : ''}
          </span>
          <span className="sax-card-price">{saxophone.priceRange}</span>
        </div>
      </div>
    </Link>
  );
}

function SaxophoneTable({ saxophones }) {
  return (
    <div className="sax-table overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Photo</th>
            <th>Brand</th>
            <th>Model</th>
            <th>Year</th>
            <th>Type</th>
            <th>Price</th>
            <th>Reviews</th>
            <th>Projection</th>
            <th>Brightness</th>
          </tr>
        </thead>
        <tbody>
          {saxophones.map((sax) => (
            <tr key={sax.id}>
              <td>
                <Link to={`/saxophone/${sax.id}`}>
                  {sax.photoURL ? (
                    <img
                      src={sax.photoURL}
                      alt={sax.model}
                      className="sax-table-photo"
                    />
                  ) : (
                    <div className="sax-table-photo-placeholder">
                      -
                    </div>
                  )}
                </Link>
              </td>
              <td>
                <Link to={`/saxophone/${sax.id}`} className="sax-table-link">
                  {sax.brand}
                </Link>
              </td>
              <td>
                <Link to={`/saxophone/${sax.id}`} className="sax-table-model">
                  {sax.model}
                </Link>
              </td>
              <td className="text-sm text-gray-600">{sax.productionYear}</td>
              <td className="text-sm text-gray-600">{sax.type}</td>
              <td className="text-sm text-gray-600">{sax.priceRange}</td>
              <td className="text-sm text-gray-600">{sax.reviewCount}</td>
              <td>
                {sax.avgRatings ? <RatingBar value={sax.avgRatings.intimateProjecting} /> : <span className="text-gray-400">-</span>}
              </td>
              <td>
                {sax.avgRatings ? <RatingBar value={sax.avgRatings.darkBright} /> : <span className="text-gray-400">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Homepage() {
  const { currentUser } = useAuth();
  const [saxophones, setSaxophones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [typeFilter, setTypeFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [priceFilter, setPriceFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  // Derived data
  const [brands, setBrands] = useState(['All']);

  useEffect(() => {
    async function fetchSaxophones() {
      try {
        const saxophonesRef = collection(db, 'saxophones');
        const saxophonesSnap = await getDocs(saxophonesRef);

        const saxophonesData = await Promise.all(
          saxophonesSnap.docs.map(async (doc) => {
            const data = doc.data();

            // Fetch reviews count and calculate averages
            const reviewsRef = collection(db, 'saxophones', doc.id, 'reviews');
            const reviewsSnap = await getDocs(reviewsRef);
            const reviewCount = reviewsSnap.size;

            // Calculate average ratings if there are reviews
            let avgRatings = null;
            if (reviewCount > 0) {
              const ratingKeys = [
                'darkBright', 'centeredBroad', 'focusedDiffuse',
                'intimateProjecting', 'resistantFreeblowing',
                'altissimo', 'keywork', 'ergonomics',
                'intonation', 'qualityControl',
              ];
              avgRatings = {};
              ratingKeys.forEach((key) => {
                const sum = reviewsSnap.docs.reduce(
                  (acc, review) => acc + (review.data().ratings?.[key] || 5),
                  0
                );
                avgRatings[key] = sum / reviewCount;
              });
            }

            return {
              id: doc.id,
              ...data,
              reviewCount,
              avgRatings,
            };
          })
        );

        setSaxophones(saxophonesData);

        // Extract unique brands
        const uniqueBrands = ['All', ...new Set(saxophonesData.map((s) => s.brand).filter(Boolean))];
        setBrands(uniqueBrands);
      } catch (err) {
        console.error('Error fetching saxophones:', err);
        setError('Failed to load saxophones');
      } finally {
        setLoading(false);
      }
    }

    fetchSaxophones();
  }, []);

  // Filter saxophones
  const filteredSaxophones = saxophones.filter((sax) => {
    if (typeFilter !== 'All' && sax.type !== typeFilter) return false;
    if (brandFilter !== 'All' && sax.brand !== brandFilter) return false;
    if (!matchesPriceFilter(sax.priceRange, priceFilter)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-warm-gray">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div>
            <h1 className="header-title">True Tone</h1>
            <p className="header-subtitle">Expert reviews without the fluff</p>
          </div>
          <nav className="header-nav">
            <Link to="/" className="header-link">Home</Link>
            <Link to="/about" className="header-link">About</Link>
            <Link to="/reviewers" className="header-link">Reviewers</Link>
            {currentUser ? (
              <Link to="/dashboard" className="nav-btn">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="nav-btn">
                Reviewer Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Filters */}
      <section className="filter-section">
        <div className="filter-content">
          {/* Type Filter */}
          <div className="filter-group">
            <label className="filter-label">Type</label>
            <div className="filter-buttons">
              {SAXOPHONE_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`filter-btn ${typeFilter === type ? 'active' : ''}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          <div className="filter-group">
            <label className="filter-label">Brand</label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="filter-select"
            >
              {brands.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          {/* Price Filter */}
          <div className="filter-group">
            <label className="filter-label">Price Range</label>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="filter-select"
            >
              {PRICE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="filter-buttons ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              title="Grid View"
            >
              <svg className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              title="Table View"
            >
              <svg className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container py-8">
        {loading && (
          <p className="text-center text-gray-500 py-12">Loading saxophones...</p>
        )}

        {error && (
          <p className="text-center text-red-600 py-12">{error}</p>
        )}

        {!loading && !error && filteredSaxophones.length === 0 && (
          <p className="text-center text-gray-500 py-12">No saxophones found matching your filters.</p>
        )}

        {!loading && !error && filteredSaxophones.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Showing {filteredSaxophones.length} saxophone{filteredSaxophones.length !== 1 ? 's' : ''}
            </p>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm-grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-6">
                {filteredSaxophones.map((sax) => (
                  <SaxophoneCard key={sax.id} saxophone={sax} />
                ))}
              </div>
            ) : (
              <SaxophoneTable saxophones={filteredSaxophones} />
            )}
          </>
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

export default Homepage;
