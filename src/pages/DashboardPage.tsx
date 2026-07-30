import {
  Archive,
  BarChart3,
  CalendarSync,
  ChartSpline,
  ChevronDown,
  Milestone,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { CreateAccountModal } from "@/components/CreateAccountModal";
import { Currency, currencyClass } from "@/components/Currency";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { narrowContainerClass } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/PageLayout";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

export const DashboardPage = observer(function DashboardPage() {
  const { ledger } = useLedger();
  const navigate = useNavigate();
  const [createAccountType, setCreateAccountType] = useState<"budget" | "tracking" | null>(null);

  if (!ledger) {
    navigate("/");
    return null;
  }

  const budgetAccounts = ledger.accounts.filter((a) => !a.archived && a.type === "budget");
  const trackingAccounts = ledger.accounts.filter((a) => !a.archived && a.type === "tracking");
  const archivedAccounts = ledger.accounts.filter((a) => a.archived);
  const netWorth = [...budgetAccounts, ...trackingAccounts].reduce(
    (sum, a) => sum + a.currentBalance,
    0
  );

  return (
    <PageLayout>
      <div className={cn(narrowContainerClass, "py-8")}>
        {/* Net worth */}
        <header className="mb-8">
          <p className="text-sm font-medium text-muted-foreground">Net worth</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">
            <Currency amount={netWorth} />
          </h1>
        </header>

        {/* Accounts */}
        <Section title="Accounts" icon={<Wallet size={16} />}>
          <CardGrid>
            {budgetAccounts.map((account) => (
              <AccountCard
                key={account.name}
                name={account.name}
                balance={account.currentBalance}
                uncategorized={account.uncategorizedTransactionCount}
              />
            ))}
            <AddCard label="Add account" onClick={() => setCreateAccountType("budget")} />
          </CardGrid>
        </Section>

        {/* Tracking accounts */}
        {trackingAccounts.length > 0 && (
          <Section title="Tracking accounts" icon={<ChartSpline size={16} />}>
            <CardGrid>
              {trackingAccounts.map((account) => (
                <AccountCard
                  key={account.name}
                  name={account.name}
                  balance={account.currentBalance}
                  uncategorized={account.uncategorizedTransactionCount}
                />
              ))}
              <AddCard label="Add account" onClick={() => setCreateAccountType("tracking")} />
            </CardGrid>
          </Section>
        )}

        {/* Savings goals */}
        {ledger.savingsGoals.length > 0 && (
          <Section title="Savings goals" icon={<Milestone size={16} />}>
            <CardGrid>
              {ledger.savingsGoals.map((goal) => (
                <Link key={goal.id} to="/budget">
                  <Card className="flex flex-col gap-2 p-4 transition-colors hover:bg-secondary/40">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium" title={goal.budget?.name || "Unknown"}>
                        {goal.budget?.name || "Unknown"}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {Math.min(100, Math.round(goal.progress.percentage))}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${Math.min(100, goal.progress.percentage)}%` }}
                      />
                    </div>
                    <span className={cn(currencyClass, "text-xs text-muted-foreground")}>
                      {formatCurrency(goal.progress.current)} / {formatCurrency(goal.targetAmount)}
                    </span>
                  </Card>
                </Link>
              ))}
            </CardGrid>
          </Section>
        )}

        {/* Quick links */}
        <Section title="More">
          <div className="flex flex-wrap gap-3">
            <QuickLink to="/budget" icon={<Wallet size={16} />} label="Budget" />
            <QuickLink to="/reports" icon={<BarChart3 size={16} />} label="Reports" />
            <QuickLink to="/recurring" icon={<CalendarSync size={16} />} label="Recurring" />
            <QuickLink to="/payees" icon={<Users size={16} />} label="Payees" />
          </div>
        </Section>

        {/* Archived accounts */}
        {archivedAccounts.length > 0 && (
          <Collapsible className="group/archived mt-8">
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <Archive size={14} />
              Archived accounts
              <ChevronDown
                size={16}
                className="transition-transform group-data-[state=open]/archived:rotate-180"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <CardGrid>
                {archivedAccounts.map((account) => (
                  <AccountCard
                    key={account.name}
                    name={account.name}
                    balance={account.currentBalance}
                    uncategorized={0}
                    muted
                  />
                ))}
              </CardGrid>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <CreateAccountModal
        open={createAccountType !== null}
        onOpenChange={(open) => {
          if (!open) setCreateAccountType(null);
        }}
        defaultType={createAccountType ?? "budget"}
      />
    </PageLayout>
  );
});

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

function AccountCard({
  name,
  balance,
  uncategorized,
  muted = false,
}: {
  name: string;
  balance: number;
  uncategorized: number;
  muted?: boolean;
}) {
  return (
    <Link to={`/ledger/${name}`}>
      <Card
        className={`flex h-full flex-col justify-between gap-3 p-4 transition-colors hover:bg-secondary/40 ${
          muted ? "opacity-70" : ""
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium" title={name}>
            {name}
          </span>
          {uncategorized > 0 && (
            <span
              className="size-2 shrink-0 rounded-full bg-amber-500"
              title={`${uncategorized} uncategorized`}
            />
          )}
        </div>
        <Currency className="text-lg font-semibold" amount={balance} />
      </Card>
    </Link>
  );
}

function AddCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className="flex h-full min-h-20 items-center justify-center gap-2 border-dashed bg-transparent text-sm font-medium text-muted-foreground shadow-none transition-colors hover:bg-secondary/40 hover:text-foreground">
        <Plus size={16} />
        {label}
      </Card>
    </button>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to}>
      <Card className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary/40">
        {icon}
        {label}
      </Card>
    </Link>
  );
}
