import cuid from "cuid";
import { startOfDay } from "date-fns";
import { computed, observable } from "mobx";
import { RRule } from "rrule";
import type { Amount } from "@/utils/types";
import type { Account } from "./Account";
import type { Budget } from "./Budget";
import type { Ledger } from "./Ledger";
import { Model, type ModelConstructorArgs } from "./Model";
import type { Payee } from "./Payee";

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

  constructor({ id, ledger }: ModelConstructorArgs) {
    super({ id: id || cuid(), ledger });
  }

  @computed
  get rrule(): RRule {
    try {
      const rule = RRule.fromString(this.rruleString);
      // Set dtstart to properly handle interval-based recurrences (like biweekly)
      rule.options.dtstart = this.startDate;
      return rule;
    } catch (e) {
      console.error("Invalid RRULE string:", this.rruleString, e);
      // Return a default monthly rule
      return new RRule({ freq: RRule.MONTHLY, bymonthday: 1, dtstart: this.startDate });
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
      // Get next occurrence after fromDate - normalize to start of day
      const next = rule.after(startOfDay(fromDate), false); // not inclusive
      return next ? startOfDay(next) : startOfDay(fromDate); // fallback if no next occurrence
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
