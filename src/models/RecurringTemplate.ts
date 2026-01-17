import { startOfDay } from "date-fns";
import { computed, observable } from "mobx";
import { RRule } from "rrule";
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

  @observable
  accessor nextScheduledDate: Date = new Date();

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

  calculateNextOccurrence(fromDate: Date): Date {
    try {
      const rule = this.rrule;
      // Convert to UTC for RRule calculation to avoid timezone issues
      const fromUTC = toUTCDate(fromDate);
      const next = rule.after(fromUTC, false); // not inclusive
      if (!next) {
        // This indicates the rule is exhausted (e.g., COUNT limit reached)
        // or there's a configuration issue. Log for debugging.
        console.warn(
          `No next occurrence found for recurring template after ${fromDate.toISOString()}`
        );
        return startOfDay(fromDate);
      }
      // Convert back from UTC to local date
      return fromUTCDate(next);
    } catch (e) {
      console.error("Error calculating next occurrence:", e);
      return startOfDay(fromDate);
    }
  }

  static fromJSON(json: any, ledger: Ledger): RecurringTemplate {
    const template = new RecurringTemplate({ id: json.id, ledger });
    template.rruleString = json.rrule_string || "FREQ=MONTHLY;BYMONTHDAY=1";
    template.nextScheduledDate = startOfDay(new Date(json.next_scheduled_date));
    template.startDate = startOfDay(new Date(json.start_date));
    template.endDate = json.end_date ? startOfDay(new Date(json.end_date)) : null;

    template.account = ledger.accounts.find((a) => a.id === json.account_id) || null;
    template.amount = json.amount || 0;
    template.budget = ledger.getBudgetByID(json.budget_id) || null;
    template.payee = ledger.payees.find((p) => p.id === json.payee_id) || null;
    template.note = json.note || "";

    return template;
  }

  toJSON() {
    return {
      id: this.id,
      rrule_string: this.rruleString,
      next_scheduled_date: this.nextScheduledDate.toISOString(),
      start_date: this.startDate.toISOString(),
      end_date: this.endDate?.toISOString() || null,
      account_id: this.account?.id || null,
      amount: this.amount,
      budget_id: this.budget?.id || null,
      payee_id: this.payee?.id || null,
      note: this.note,
    };
  }
}
