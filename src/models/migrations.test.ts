import { describe, expect, it } from "vitest";
import { CURRENT_VERSION, migrateLedger } from "./migrations";

describe("migrateLedger v3 (recurring watermark)", () => {
  it("seeds last_generated_date from the latest matching transaction", () => {
    const data = {
      version: 2,
      transactions: [
        { id: "t1", recurring_template_id: "r1", date: "2024-01-15" },
        { id: "t2", recurring_template_id: "r1", date: "2024-03-15" },
        { id: "t3", recurring_template_id: "r1", date: "2024-02-15" },
        { id: "t4", recurring_template_id: "r2", date: "2024-05-01" },
        { id: "t5", recurring_template_id: null, date: "2024-06-01" },
      ],
      recurring_templates: [
        { id: "r1", next_scheduled_date: "2024-04-15", start_date: "2024-01-15" },
        { id: "r2", next_scheduled_date: "2024-06-01", start_date: "2024-05-01" },
        { id: "r3", next_scheduled_date: "2024-07-01", start_date: "2024-07-01" },
      ],
    };

    migrateLedger(data);

    const [r1, r2, r3] = data.recurring_templates as any[];
    expect(r1.last_generated_date).toBe("2024-03-15"); // latest of r1's txns
    expect(r2.last_generated_date).toBe("2024-05-01");
    expect(r3.last_generated_date).toBeNull(); // no generated transactions yet

    // Old field removed.
    expect("next_scheduled_date" in r1).toBe(false);
    expect("next_scheduled_date" in r3).toBe(false);

    expect(data.version).toBe(CURRENT_VERSION);
  });

  it("handles a ledger with no recurring templates", () => {
    const data = { version: 2, transactions: [], recurring_templates: [] };
    expect(() => migrateLedger(data)).not.toThrow();
    expect(data.version).toBe(CURRENT_VERSION);
  });
});
