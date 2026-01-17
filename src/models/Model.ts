import cuid from "cuid";
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

  constructor({ id, ledger }: { id: string | null; ledger: Ledger }) {
    this.id = id || cuid();
    this.ledger = ledger;
  }
}
