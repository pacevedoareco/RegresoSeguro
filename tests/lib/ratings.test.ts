import { describe, it, expect } from "vitest";
import {
  isValidRatingStars,
  calculateNewAverageRating,
} from "@/lib/ratings/ratings";

describe("Ratings pure logic", () => {
  describe("isValidRatingStars", () => {
    it("accepts valid integer ratings between 1 and 5", () => {
      expect(isValidRatingStars(1)).toBe(true);
      expect(isValidRatingStars(2)).toBe(true);
      expect(isValidRatingStars(3)).toBe(true);
      expect(isValidRatingStars(4)).toBe(true);
      expect(isValidRatingStars(5)).toBe(true);
    });

    it("rejects values out of bounds or non-integers", () => {
      expect(isValidRatingStars(0)).toBe(false);
      expect(isValidRatingStars(6)).toBe(false);
      expect(isValidRatingStars(-1)).toBe(false);
      expect(isValidRatingStars(4.5)).toBe(false);
      expect(isValidRatingStars(NaN)).toBe(false);
    });
  });

  describe("calculateNewAverageRating", () => {
    it("calculates the first rating correctly", () => {
      const result = calculateNewAverageRating({
        currentAverage: null,
        currentCount: 0,
        newStars: 5,
      });
      expect(result).toEqual({ average: 5, count: 1 });
    });

    it("computes the rolling arithmetic average accurately", () => {
      // (5 * 1 + 3) / 2 = 4.00
      const step1 = calculateNewAverageRating({
        currentAverage: 5,
        currentCount: 1,
        newStars: 3,
      });
      expect(step1).toEqual({ average: 4, count: 2 });

      // (4 * 2 + 4) / 3 = 4.00
      const step2 = calculateNewAverageRating({
        currentAverage: 4,
        currentCount: 2,
        newStars: 4,
      });
      expect(step2).toEqual({ average: 4, count: 3 });

      // (4 * 3 + 2) / 4 = 3.50
      const step3 = calculateNewAverageRating({
        currentAverage: 4,
        currentCount: 3,
        newStars: 2,
      });
      expect(step3).toEqual({ average: 3.5, count: 4 });
    });

    it("throws an error when invalid stars are provided", () => {
      expect(() =>
        calculateNewAverageRating({
          currentAverage: 4,
          currentCount: 2,
          newStars: 6,
        })
      ).toThrow("Stars must be an integer between 1 and 5.");
    });
  });
});
