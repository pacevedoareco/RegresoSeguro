/**
 * Rating validation and average calculation logic (pure functions)
 * BR-024: Mutual rating after completion
 * BR-025: Rating is 1-5 stars; comment is optional
 * BR-026: One rating per party per service
 * BR-027: Rolling arithmetic average
 */

export interface CalculateAverageRatingInput {
  currentAverage: number | null;
  currentCount: number;
  newStars: number;
}

/**
 * Validates that the star rating is an integer between 1 and 5 (BR-025).
 */
export function isValidRatingStars(stars: number): boolean {
  return Number.isInteger(stars) && stars >= 1 && stars <= 5;
}

/**
 * Calculates the new rolling average rating after receiving a new rating.
 * Formula: ((currentAverage * currentCount) + newStars) / (currentCount + 1)
 * Returns a number rounded to 2 decimal places.
 */
export function calculateNewAverageRating({
  currentAverage,
  currentCount,
  newStars,
}: CalculateAverageRatingInput): { average: number; count: number } {
  if (!isValidRatingStars(newStars)) {
    throw new Error("Stars must be an integer between 1 and 5.");
  }

  const newCount = currentCount + 1;
  const prevTotal = (currentAverage ?? 0) * currentCount;
  const newAverage = Number(((prevTotal + newStars) / newCount).toFixed(2));

  return {
    average: newAverage,
    count: newCount,
  };
}
