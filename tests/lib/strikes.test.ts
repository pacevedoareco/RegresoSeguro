import { describe, it, expect } from "vitest";
import {
  cancellationIncursStrike,
  shouldBeSuspended,
  newStrikeCount,
} from "@/lib/strikes/strikes";

describe("Strike logic (BR-002, BR-003, BR-004)", () => {
  describe("cancellationIncursStrike", () => {
    it("returns true when cancelling from assigned status (BR-003)", () => {
      expect(cancellationIncursStrike("assigned")).toBe(true);
    });

    it("returns false when cancelling from requested status (BR-004)", () => {
      expect(cancellationIncursStrike("requested")).toBe(false);
    });

    it("returns false for all other statuses", () => {
      expect(cancellationIncursStrike("en_route")).toBe(false);
      expect(cancellationIncursStrike("in_progress")).toBe(false);
      expect(cancellationIncursStrike("completed")).toBe(false);
      expect(cancellationIncursStrike("cancelled")).toBe(false);
    });
  });

  describe("shouldBeSuspended", () => {
    it("returns true when strikes = 3 (BR-002)", () => {
      expect(shouldBeSuspended(3)).toBe(true);
    });

    it("returns true when strikes > 3", () => {
      expect(shouldBeSuspended(4)).toBe(true);
      expect(shouldBeSuspended(10)).toBe(true);
    });

    it("returns false when strikes < 3", () => {
      expect(shouldBeSuspended(0)).toBe(false);
      expect(shouldBeSuspended(1)).toBe(false);
      expect(shouldBeSuspended(2)).toBe(false);
    });
  });

  describe("newStrikeCount", () => {
    it("increments strike count when cancelling from assigned (BR-003)", () => {
      expect(newStrikeCount(0, "assigned")).toBe(1);
      expect(newStrikeCount(1, "assigned")).toBe(2);
      expect(newStrikeCount(2, "assigned")).toBe(3);
    });

    it("does not increment when cancelling from requested (BR-004)", () => {
      expect(newStrikeCount(0, "requested")).toBe(0);
      expect(newStrikeCount(2, "requested")).toBe(2);
    });
  });
});
