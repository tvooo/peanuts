import { action, observable } from "mobx";
import type { Ledger } from "./Ledger";
import { Model } from "./Model";

export class Payee extends Model {
  @observable
  accessor name: string = "New payee";

  /** Raw counterparty names from bank statements that map to this payee */
  @observable
  accessor importNames: string[] = [];

  static fromJSON(json: any, ledger: Ledger): Payee {
    const account = new Payee({ id: json.id, ledger });
    account.name = json.name;
    account.importNames = json.import_names || [];
    return account;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      import_names: this.importNames,
    };
  }

  @action
  addImportName(rawName: string) {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    if (this.importNames.includes(trimmed)) return;
    this.importNames.push(trimmed);
    this.notifyChange();
  }
}
