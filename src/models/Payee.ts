import cuid from 'cuid';
import { observable } from "mobx";
import { Ledger } from "./Ledger";
import { Model } from "./Model";

export class Payee extends Model {
  @observable
  accessor name: string = "New payee";

  constructor({ id, ledger }: { id: string | null, ledger: Ledger }) {
    super({
      id: id || cuid(),
      ledger
    })
  }

  static fromJSON(json: any, ledger: Ledger): Payee {
    const account = new Payee({ id: json.id, ledger });  
    account.name = json.name;
    return account;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
    }
  }
}
