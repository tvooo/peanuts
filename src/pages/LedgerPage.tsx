import { Textarea } from "@/components/ui/textarea";
import { PageLayout } from "@/PageLayout";
import { useLedger } from "@/utils/useLedger";
export const LedgerPage = () => {
  const { ledger } = useLedger();
  return (
    <PageLayout>
      <Textarea
        className="w-full h-full bg-transparent font-mono"
        defaultValue={ledger?.source || ""}
      ></Textarea>
    </PageLayout>
  );
};
