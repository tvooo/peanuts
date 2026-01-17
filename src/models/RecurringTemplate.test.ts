import { isSameDay, startOfDay } from "date-fns";
import { describe, expect, it } from "vitest";
import { Ledger } from "./Ledger";
import { RecurringTemplate } from "./RecurringTemplate";

// Helper to create a template with the given rrule and start date
function createTemplate(
  rruleString: string,
  startDate: Date,
  nextScheduledDate?: Date
): RecurringTemplate {
  const ledger = new Ledger();
  const template = new RecurringTemplate({ id: "test-template", ledger });
  template.rruleString = rruleString;
  template.startDate = startOfDay(startDate);
  template.nextScheduledDate = startOfDay(nextScheduledDate || startDate);
  return template;
}

describe("RecurringTemplate", () => {
  describe("calculateNextOccurrence", () => {
    describe("monthly on specific day", () => {
      it("advances from 15th to next month 15th", () => {
        const template = createTemplate(
          "FREQ=MONTHLY;BYMONTHDAY=15",
          new Date(2024, 0, 1) // Jan 1, 2024
        );

        const jan15 = new Date(2024, 0, 15);
        const next = template.calculateNextOccurrence(jan15);

        expect(isSameDay(next, new Date(2024, 1, 15))).toBe(true); // Feb 15
      });

      it("advances from Feb 15 to Mar 15", () => {
        const template = createTemplate("FREQ=MONTHLY;BYMONTHDAY=15", new Date(2024, 0, 1));

        const feb15 = new Date(2024, 1, 15);
        const next = template.calculateNextOccurrence(feb15);

        expect(isSameDay(next, new Date(2024, 2, 15))).toBe(true); // Mar 15
      });

      it("handles last day of month", () => {
        const template = createTemplate("FREQ=MONTHLY;BYMONTHDAY=-1", new Date(2024, 0, 1));

        const jan31 = new Date(2024, 0, 31);
        const next = template.calculateNextOccurrence(jan31);

        // Feb 29 (2024 is a leap year)
        expect(isSameDay(next, new Date(2024, 1, 29))).toBe(true);
      });
    });

    describe("biweekly (interval-based)", () => {
      it("advances by 2 weeks from startDate", () => {
        const startDate = new Date(2024, 0, 1); // Monday Jan 1, 2024
        const template = createTemplate("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", startDate);

        // From Jan 1 (the start), next should be Jan 15 (2 weeks later)
        const next = template.calculateNextOccurrence(startDate);
        expect(isSameDay(next, new Date(2024, 0, 15))).toBe(true);
      });

      it("maintains correct 2-week interval", () => {
        const startDate = new Date(2024, 0, 1); // Monday Jan 1, 2024
        const template = createTemplate("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", startDate);

        // From Jan 15, next should be Jan 29
        const jan15 = new Date(2024, 0, 15);
        const next = template.calculateNextOccurrence(jan15);
        expect(isSameDay(next, new Date(2024, 0, 29))).toBe(true);
      });

      it("dtstart affects which weeks are valid", () => {
        // Start on Jan 8 (second Monday)
        const startDate = new Date(2024, 0, 8);
        const template = createTemplate("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", startDate);

        // From Jan 8, next should be Jan 22 (not Jan 15!)
        const next = template.calculateNextOccurrence(startDate);
        expect(isSameDay(next, new Date(2024, 0, 22))).toBe(true);
      });
    });

    describe("weekly", () => {
      it("advances by 1 week", () => {
        const startDate = new Date(2024, 0, 1); // Monday
        const template = createTemplate("FREQ=WEEKLY;BYDAY=MO", startDate);

        const next = template.calculateNextOccurrence(startDate);
        expect(isSameDay(next, new Date(2024, 0, 8))).toBe(true);
      });
    });

    describe("yearly", () => {
      it("advances from Jan 1 to next Jan 1", () => {
        const startDate = new Date(2024, 0, 1);
        const template = createTemplate("FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1", startDate);

        const next = template.calculateNextOccurrence(startDate);
        expect(isSameDay(next, new Date(2025, 0, 1))).toBe(true);
      });

      it("handles Feb 29 on non-leap year", () => {
        const startDate = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
        const template = createTemplate("FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29", startDate);

        // Next Feb 29 is in 2028
        const next = template.calculateNextOccurrence(startDate);
        expect(isSameDay(next, new Date(2028, 1, 29))).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("returns a future date when called with a past date", () => {
        const startDate = new Date(2024, 0, 1);
        const template = createTemplate("FREQ=MONTHLY;BYMONTHDAY=15", startDate);

        // Call with a date before the next occurrence
        const jan10 = new Date(2024, 0, 10);
        const next = template.calculateNextOccurrence(jan10);

        // Should return Jan 15, not skip to Feb 15
        expect(isSameDay(next, new Date(2024, 0, 15))).toBe(true);
      });

      it("handles template with no more valid occurrences gracefully", () => {
        const startDate = new Date(2024, 0, 1);
        const template = createTemplate(
          "FREQ=MONTHLY;BYMONTHDAY=15;COUNT=1",
          startDate,
          new Date(2024, 0, 15) // Already used the one occurrence
        );

        // After the COUNT=1 is exhausted, should not crash
        const jan15 = new Date(2024, 0, 15);
        const next = template.calculateNextOccurrence(jan15);

        // Should return something (even if it's the fallback)
        expect(next).toBeDefined();
        expect(next instanceof Date).toBe(true);
      });
    });
  });

  describe("rrule getter", () => {
    it("creates valid RRule for monthly pattern", () => {
      const template = createTemplate("FREQ=MONTHLY;BYMONTHDAY=15", new Date(2024, 0, 1));

      const rule = template.rrule;
      expect(rule).toBeDefined();

      // Verify we can get occurrences
      const next = rule.after(new Date(2024, 0, 1), false);
      expect(next).toBeDefined();
      expect(isSameDay(next!, new Date(2024, 0, 15))).toBe(true);
    });

    it("creates valid RRule for biweekly pattern with correct dtstart", () => {
      const startDate = new Date(2024, 0, 1); // Monday Jan 1
      const template = createTemplate("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", startDate);

      const rule = template.rrule;
      expect(rule).toBeDefined();

      // The rule should use startDate as dtstart
      expect(isSameDay(rule.options.dtstart!, startDate)).toBe(true);
    });

    it("handles invalid rrule string gracefully", () => {
      const template = createTemplate("INVALID_RRULE_STRING", new Date(2024, 0, 1));

      // Should not throw, should return a default rule
      const rule = template.rrule;
      expect(rule).toBeDefined();
    });
  });
});
