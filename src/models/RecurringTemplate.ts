import { startOfDay } from "date-fns";
import { computed, observable } from "mobx";
import { RRule } from "rrule";
import { deserializeDate, serializeDate } from "@/utils/dateSerialize";
import type { Amount } from "@/utils/types";
import type { Account } from "./Account";
import type { Budget } from "./Budget";
import type { Ledger } from "./Ledger";
import { Model } from "./Model";
import type { Payee } from "./Payee";

/**
 * Convert a local date to a UTC date with the same year/month/day values.
 * RRule works best with UTC dates - using local dates can cause off-by-one
 * day errors when the local timezone is ahead of UTC.
 */
function toUTCDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/**
 * Convert a UTC date back to a local date with the same year/month/day values.
 */
function fromUTCDate(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export class RecurringTemplate extends Model {
  @observable
  accessor rruleString: string = "FREQ=MONTHLY;BYMONTHDAY=1"; // Default: monthly on 1st

  /**
   * Watermark: the occurrence date of the most recently materialized
   * transaction. This is the single source of truth for what has already been
   * generated. `null` means nothing has been generated yet. Generation only
   * ever creates occurrences strictly after this date.
   */
  @observable
  accessor lastGeneratedDate: Date | null = null;

  @observable
  accessor startDate: Date = new Date();

  @observable
  accessor endDate: Date | null = null;

  // Transaction template data
  @observable
  accessor account: Account | null = null;

  // Posting template data (single posting for now)
  @observable
  accessor amount: Amount = 0;

  @observable
  accessor budget: Budget | null = null;

  @observable
  accessor payee: Payee | null = null;

  @observable
  accessor note: string = "";

  @computed
  get rrule(): RRule {
    try {
      const parsed = RRule.fromString(this.rruleString);
      const opts = parsed.options;
      // Create a NEW RRule with the correct dtstart - mutating options.dtstart
      // after parsing doesn't properly affect interval-based calculations.
      // Use UTC date to avoid timezone-related off-by-one day errors.
      // Reset byhour/byminute/bysecond to midnight to avoid time-of-day issues.
      // Note: RRule separates BYMONTHDAY into bymonthday (positive) and bynmonthday (negative),
      // but the constructor expects them combined in bymonthday, so we recombine them.
      const combinedBymonthday = [...(opts.bymonthday || []), ...(opts.bynmonthday || [])];
      return new RRule({
        freq: opts.freq,
        interval: opts.interval,
        wkst: opts.wkst,
        count: opts.count,
        until: opts.until,
        bysetpos: opts.bysetpos,
        bymonth: opts.bymonth,
        bymonthday: combinedBymonthday.length > 0 ? combinedBymonthday : undefined,
        byyearday: opts.byyearday,
        byweekno: opts.byweekno,
        byweekday: opts.byweekday,
        dtstart: toUTCDate(this.startDate),
        byhour: [0],
        byminute: [0],
        bysecond: [0],
      });
    } catch (e) {
      console.error("Invalid RRULE string:", this.rruleString, e);
      // Return a default monthly rule
      return new RRule({ freq: RRule.MONTHLY, bymonthday: 1, dtstart: toUTCDate(this.startDate) });
    }
  }

  @computed
  get scheduleDescription(): string {
    try {
      return this.rrule.toText();
    } catch {
      return "Invalid schedule";
    }
  }

  /**
   * The first occurrence strictly after `fromDate`, or `null` if the rule is
   * exhausted (e.g. COUNT or UNTIL reached). Returning `null` lets the
   * generator stop cleanly instead of looping on a fallback date.
   */
  calculateNextOccurrence(fromDate: Date): Date | null {
    try {
      const rule = this.rrule;
      // Convert to UTC for RRule calculation to avoid timezone issues
      const fromUTC = toUTCDate(fromDate);
      const next = rule.after(fromUTC, false); // not inclusive
      if (!next) return null;
      // Convert back from UTC to local date
      return startOfDay(fromUTCDate(next));
    } catch (e) {
      console.error("Error calculating next occurrence:", e);
      return null;
    }
  }

  /**
   * The next occurrence on or after today, for display ("Next date").
   * Clamped to `endDate`. Returns `null` if the schedule has no more
   * occurrences.
   */
  @computed
  get nextOccurrence(): Date | null {
    try {
      const next = this.rrule.after(toUTCDate(startOfDay(new Date())), true);
      if (!next) return null;
      const local = startOfDay(fromUTCDate(next));
      if (this.endDate && local > startOfDay(this.endDate)) return null;
      return local;
    } catch (e) {
      console.error("Error calculating next occurrence:", e);
      return null;
    }
  }

  static fromJSON(json: any, ledger: Ledger): RecurringTemplate {
    const template = new RecurringTemplate({ id: json.id, ledger });
    template.rruleString = json.rrule_string || "FREQ=MONTHLY;BYMONTHDAY=1";
    template.lastGeneratedDate = json.last_generated_date
      ? deserializeDate(json.last_generated_date)
      : null;
    template.startDate = deserializeDate(json.start_date);
    template.endDate = json.end_date ? deserializeDate(json.end_date) : null;

    template.account = ledger.getAccountByIdFast(json.account_id) || null;
    template.amount = json.amount || 0;
    template.budget = ledger.getBudgetByIdFast(json.budget_id) || null;
    template.payee = ledger.getPayeeByIdFast(json.payee_id) || null;
    template.note = json.note || "";

    return template;
  }

  toJSON() {
    return {
      id: this.id,
      rrule_string: this.rruleString,
      last_generated_date: this.lastGeneratedDate ? serializeDate(this.lastGeneratedDate) : null,
      start_date: serializeDate(this.startDate),
      end_date: this.endDate ? serializeDate(this.endDate) : null,
      account_id: this.account?.id || null,
      amount: this.amount,
      budget_id: this.budget?.id || null,
      payee_id: this.payee?.id || null,
      note: this.note,
    };
  }
}
