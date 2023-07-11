"use client";

import { SidebarCollapse } from "iconoir-react";

import { Button } from "@/components/Button";
import { Sidebar } from "@/components/Sidebar";

import { Ledger } from "@/models/Ledger";
import { LedgerContext } from "@/utils/useLedger";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(
    null
  );
  const [ledgerText, setLedgerText] = useState<string>();
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [ledger, setLedger] = useState<Ledger | null>(new Ledger())

  useEffect(() => {
    async function doit() {
      console.log(fileHandle)
      if (!fileHandle) {
        return;
      }
      const file = await fileHandle.getFile();
      const contents = await file.text();
      setLedgerText(contents);
      const l = Ledger.fromSource(contents);
      l.name = "Tim's budget"
      l.fileName = fileHandle.name

      l.aliases.set('dkb', 'DKB')
      l.aliases.set("asn", "ASN Bank");
      l.aliases.set("software", "Software & Hosting");
      l.aliases.set("insurance", "Insurance & Banking");
      l.aliases.set("coffee", "Coffee");
      l.aliases.set("entertainment", "Books, Entertainment");
      l.aliases.set("apple", " Apple");
      l.aliases.set("wuertt", "Wuerttembergische");
      l.aliases.set("audible", "Audible");
      l.aliases.set("investing", "Investing");
      l.aliases.set("misc", "Miscellaneous");
      l.aliases.set("watch-or-not", "The Watch/Invest pledge");
      l.aliases.set("watch2023", "New  Watch (2023)");
      l.aliases.set("glasses", "Glasses");
      l.aliases.set("hallofframe", "Hall of Frame");

      l.aliases.set("bectim", "Beccy & Tim");
      l.aliases.set("thevillage", "The Village");
      l.aliases.set("rockingchair", "Rocking Chair");
      l.aliases.set("wc", "WC");
      l.aliases.set("tr", "Trade Republic");
      l.aliases.set("blommers", "Blommers Coffee Roasters");
      l.aliases.set("fun", "Enjoying Life");

      l.transactions.forEach((t) => {
        t.account.processTransaction(t);
      });

      setLedger(l);
    }
    doit();
  }, [fileHandle]);

  return (
    <LedgerContext.Provider value={ledger}>
      <main className="text-stone-800 flex min-h-screen flex-col items-stretch justify-between">
        <div
          className="flex flex-grow basis-full h-screen items-stretch flex-[1_1_0%]"
          style={{
            transition: "all 0.3s ease 0s",
            marginLeft: showSidebar ? "0" : "-280px",
          }}
        >
          <div className="bg-stone-100 border-r-stone-300 border-r-[1px] flex-[1_0_280px]">
            <Sidebar
              fileHandle={fileHandle}
              onOpenLedgerClick={async () => {
                const result = await window.showOpenFilePicker();
                const [fh] = result;
                setFileHandle(fh);
              }}
            />
            {/* <button
              onClick={async () => {
                const result = await window.showOpenFilePicker();
                const [fh] = result;
                setFileHandle(fh);
              }}
            >
              open
            </button> */}
          </div>

          <div className="bg-white flex-[1_1_100%]">
            <div className="p-2 px-8 flex">
              <Button onClick={() => setShowSidebar((t) => !t)}>
                <SidebarCollapse />
              </Button>
              <input
                type="text"
                className="bg-white ring-1 ring-stone-400 rounded-md ml-auto text-sm p-1"
                placeholder="Search..."
              />
            </div>
            {children}
          </div>
        </div>
      </main>
    </LedgerContext.Provider>
  );
}
