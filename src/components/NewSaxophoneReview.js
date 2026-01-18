import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ReviewRatingSliders from './ReviewRatingSliders';

const SAXOPHONE_TYPES = ['Soprano', 'Alto', 'Tenor', 'Baritone'];

function NewSaxophoneReview() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Saxophone master record state
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('');
  const [productionYear, setProductionYear] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [description, setDescription] = useState('');

  // Review data state
  const [reviewData, setReviewData] = useState(null);

  // Form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReviewChange = (data) => {
    setReviewData(data);
  };

  const validateForm = () => {
    if (!brand.trim()) return 'Brand is required';
    if (!model.trim()) return 'Model is required';
    if (!type) return 'Saxophone type is required';
    if (!productionYear.trim()) return 'Production year is required';
    if (!priceRange.trim()) return 'Price range is required';
    if (!description.trim()) return 'Description is required';
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
      // Upload photo if provided
      let photoURL = null;
      if (photo) {
        const photoRef = ref(storage, `saxophones/${Date.now()}_${photo.name}`);
        await uploadBytes(photoRef, photo);
        photoURL = await getDownloadURL(photoRef);
      }

      // Create saxophone master record
      const saxophoneData = {
        brand: brand.trim(),
        model: model.trim(),
        type,
        productionYear: productionYear.trim(),
        priceRange: priceRange.trim(),
        photoURL,
        description: description.trim(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      };

      const saxophoneRef = await addDoc(collection(db, 'saxophones'), saxophoneData);

      // Create the first review in the reviews subcollection
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

      await addDoc(collection(db, 'saxophones', saxophoneRef.id, 'reviews'), reviewDocument);

      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-gray">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <Link to="/" className="header-title">
            True Tone
          </Link>
          <button
            onClick={() => navigate('/dashboard')}
            className="nav-btn-ghost"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-10" style={{ maxWidth: '48rem' }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-deep-black mb-2">Review a New Saxophone</h1>
          <p className="text-gray-500">Add a new saxophone to our database and be the first to review it.</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section A: Saxophone Details */}
          <section className="section">
            <h2 className="section-title">
              Section A: Saxophone Details
            </h2>

            <div className="grid md-grid-cols-2 gap-5 mb-5">
              <div>
                <label className="form-label">Brand *</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g., Selmer"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Model *</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g., Series III"
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid md-grid-cols-2 gap-5 mb-5">
              <div>
                <label className="form-label">Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select type...</option>
                  {SAXOPHONE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Production Year *</label>
                <input
                  type="text"
                  value={productionYear}
                  onChange={(e) => setProductionYear(e.target.value)}
                  placeholder="e.g., 2022"
                  className="form-input"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="form-label">Price Range *</label>
              <input
                type="text"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                placeholder="e.g., $7,000-8,000"
                className="form-input"
              />
            </div>

            <div className="mb-5">
              <label className="form-label">Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="form-file"
              />
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="photo-preview"
                />
              )}
            </div>

            <div>
              <label className="form-label">What It Actually Is *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this saxophone - its key features, target player, and what makes it unique..."
                rows={4}
                className="form-textarea"
              />
            </div>
          </section>

          {/* Section B: Your Review */}
          <section className="section">
            <h2 className="section-title">
              Section B: Your Review
            </h2>
            <ReviewRatingSliders
              reviewData={reviewData}
              onChange={handleReviewChange}
              userCredentials={currentUser?.displayName}
            />
          </section>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg btn-full"
          >
            {loading ? 'Submitting...' : 'Submit Saxophone & Review'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default NewSaxophoneReview;
