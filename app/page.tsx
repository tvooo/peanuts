"use client";

import { Account } from "@/models/Account";
import { formatCurrency, formatDate } from "@/utils/formatting";
import { ledger } from "@/utils/ledger.mock";
import { sortBy } from 'lodash';
import Image from "next/image";
import { Fragment, useEffect, useState } from "react";

const l = ledger.alias.bind(ledger)

export default function Home() {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [ledgerText, setLedgerText] = useState<string>();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null)

  useEffect(() => {
    async function doit() {
      if (!fileHandle) {
        return;
      }
      const file = await fileHandle.getFile();
      const contents = await file.text();
      setLedgerText(contents);
    }
    doit();
  }, [fileHandle]);

  return (
    <main className="text-stone-800 flex min-h-screen flex-col items-center justify-between">
      <div className="grid grid-cols-[minmax(300px,max-content),auto] w-full h-screen items-stretch">
        {/* <div className="w-full h-full p-8 bg-white">
          {fileHandle ? (
            <textarea
              className="w-full h-full bg-transparent"
              value={ledgerText}
            ></textarea>
          ) : (
            <button
              onClick={async () => {
                const result = await window.showOpenFilePicker();
                const [fh] = result;
                setFileHandle(fh);
              }}
            >
              open
            </button>
          )}
        </div> */}

        <div className="bg-stone-200 p-4 text-sm">
          <button className="px-2 py-1" onClick={() => setCurrentAccount(null)}>
            Budget
          </button>

          <h2 className="p-2 text-stone-600 text-xs font-bold uppercase">
            Accounts
          </h2>
          <div className="flex flex-col justify-stretch">
            {ledger.accounts.map((account, idx) => (
              <button
                key={idx}
                className="px-2 py-1 flex  gap-3 justify-between hover:bg-slate-300 border border-transparent hover:border-slate-700"
                onClick={() => setCurrentAccount(account)}
              >
                <div>{l(account.name)}</div>
                <div className="font-mono">
                  {formatCurrency(account.currentBalance)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-stone-100 p-8">
          {currentAccount ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{l(currentAccount.name)}</h2>
                <div>
                  <div className="text-sm">Balance</div>
                  <div className="text-md font-bold">
                    {formatCurrency(currentAccount.currentBalance)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5">
                <div className="uppercase text-sm font-bold text-stone-600">
                  Date
                </div>
                <div className="uppercase text-sm font-bold text-stone-600">
                  Payee
                </div>
                <div className="uppercase text-sm font-bold text-stone-600">
                  Budget
                </div>
                <div className="uppercase text-sm font-bold text-stone-600">
                  Note
                </div>
                <div className="uppercase text-sm font-bold text-stone-600 self-end text-right">
                  Amount
                </div>
                {sortBy(ledger.transactionsForAccount(currentAccount), "date")
                  .reverse()
                  .map((transaction, idx) => (
                    <Fragment key={idx}>
                      <div>{formatDate(transaction.date)}</div>
                      <div>{transaction.postings[0].payee}</div>
                      <div>{l(transaction.postings[0].budget.name)}</div>
                      <div>{transaction.postings[0].note}</div>
                      <div className="font-mono self-end text-right">
                        {formatCurrency(transaction.amount)}
                      </div>
                    </Fragment>
                  ))}
                d
              </div>
            </div>
          ) : (
            <div>
              <h2>Budgeeet</h2>
              <div className="grid grid-cols-2">
                {ledger.budgets.map((budget, idx) => (
                  <Fragment key={idx}>
                    <div>{l(budget.name)}</div>
                    <div className="font-mono">
                      {formatCurrency(budget.currentBalance)}
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* </div> */}
      {/* <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Get started by editing&nbsp;
          <code className="font-mono font-bold">app/page.tsx</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            By{' '}
            <Image
              src="/vercel.svg"
              alt="Vercel Logo"
              className="dark:invert"
              width={100}
              height={24}
              priority
            />
          </a>
        </div>
      </div> */}

      <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 before:lg:h-[360px]">
        <Image
          className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
          src="/next.svg"
          alt="Next.js Logo"
          width={180}
          height={37}
          priority
        />
      </div>

      <div className="mb-32 grid text-center lg:mb-0 lg:grid-cols-4 lg:text-left">
        <a
          href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Docs{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Find in-depth information about Next.js features and API.
          </p>
        </a>

        <a
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Learn{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Learn about Next.js in an interactive course with&nbsp;quizzes!
          </p>
        </a>

        <a
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Templates{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Explore the Next.js 13 playground.
          </p>
        </a>

        <a
          href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Deploy{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Instantly deploy your Next.js site to a shareable URL with Vercel.
          </p>
        </a>
      </div>
    </main>
  );
}
