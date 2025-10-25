import { useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function SafetyReview({ locationId, user, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feltSafe, setFeltSafe] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || rating === 0) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('safety_reviews')
        .insert({
          location_id: locationId,
          reviewer_id: user.id,
          rating,
          felt_safe: feltSafe,
          visible: rating >= 4, // Only show 4-5 star reviews publicly
          review_text: comment
        });

      if (error) throw error;
      
      // Reset form
      setRating(0);
      setComment('');
      setFeltSafe(true);
      onReviewSubmitted?.();
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-earth-800 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Leave a Safety Review</h3>
      
      {/* Star Rating */}
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-gray-300 text-sm">Rating:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-500'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Felt Safe Checkbox */}
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="checkbox"
          id="feltSafe"
          checked={feltSafe}
          onChange={(e) => setFeltSafe(e.target.checked)}
          className="rounded bg-earth-700 border-gray-600 text-indigo-500"
        />
        <label htmlFor="feltSafe" className="text-gray-300 text-sm">
          I felt safe at this location
        </label>
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience (optional)..."
        rows="3"
        className="w-full rounded-md bg-earth-700 border-gray-600 text-white p-2 mb-4"
      />

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="btn-primary w-full disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
