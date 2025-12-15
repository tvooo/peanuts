import { observable } from "mobx";
import type { Ledger } from "./Ledger";

export interface ModelConstructorArgs {
  id: string | null;
  ledger: Ledger;
}

export abstract class Model {
  @observable
  accessor id: string;

  ledger: Ledger;

  constructor({ id, ledger }: { id: string; ledger: Ledger }) {
    this.id = id;
    this.ledger = ledger;
  }
}
