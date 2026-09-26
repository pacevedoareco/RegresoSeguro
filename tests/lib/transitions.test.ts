import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  allowedNextStatuses,
} from "@/lib/services/transitions";

describe("Status transition validation (BR-014, BR-015)", () => {
  describe("isValidTransition", () => {
    it("allows requested → assigned (operator assignment)", () => {
      expect(isValidTransition("requested", "assigned")).toBe(true);
    });

    it("allows requested → cancelled (free cancel BR-004)", () => {
      expect(isValidTransition("requested", "cancelled")).toBe(true);
    });

    it("allows assigned → en_route (driver)", () => {
      expect(isValidTransition("assigned", "en_route")).toBe(true);
    });

    it("allows assigned → cancelled (rider strike cancel BR-003)", () => {
      expect(isValidTransition("assigned", "cancelled")).toBe(true);
    });

    it("allows en_route → in_progress (driver)", () => {
      expect(isValidTransition("en_route", "in_progress")).toBe(true);
    });

    it("allows in_progress → completed (driver)", () => {
      expect(isValidTransition("in_progress", "completed")).toBe(true);
    });

    it("rejects requested → completed (invalid skip)", () => {
      expect(isValidTransition("requested", "completed")).toBe(false);
    });

    it("rejects requested → en_route (invalid skip)", () => {
      expect(isValidTransition("requested", "en_route")).toBe(false);
    });

    it("rejects en_route → cancelled (invalid from en_route)", () => {
      expect(isValidTransition("en_route", "cancelled")).toBe(false);
    });

    it("rejects completed → any (terminal state)", () => {
      expect(isValidTransition("completed", "cancelled")).toBe(false);
      expect(isValidTransition("completed", "requested")).toBe(false);
    });

    it("rejects cancelled → any (terminal state)", () => {
      expect(isValidTransition("cancelled", "requested")).toBe(false);
      expect(isValidTransition("cancelled", "assigned")).toBe(false);
    });
  });

  describe("allowedNextStatuses", () => {
    it("returns correct options for requested", () => {
      const next = allowedNextStatuses("requested");
      expect(next).toContain("assigned");
      expect(next).toContain("cancelled");
      expect(next).toHaveLength(2);
    });

    it("returns empty array for completed", () => {
      expect(allowedNextStatuses("completed")).toHaveLength(0);
    });

    it("returns empty array for cancelled", () => {
      expect(allowedNextStatuses("cancelled")).toHaveLength(0);
    });
  });
});
