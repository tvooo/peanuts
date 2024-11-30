import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageLayout } from "@/PageLayout";
import { ChevronsUpDown, DoorClosedIcon, PiggyBank, SaveIcon } from "lucide-react";

export const SubscriptionsPage = () => {
    return (
      <PageLayout>
        <h1 className="text-4xl font-bold">Subscriptions Page</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <div className="w-7 h-7 my-2 rounded-2xl bg-green-600 flex items-center justify-center">
                <PiggyBank size={16} color="white" />
              </div>
              <strong>Joint budget</strong>
              {/* <span>joint.budget</span> */}
              <ChevronsUpDown size={16} className="ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
            <DropdownMenuItem>
              <SaveIcon size={16} />
              <span>Save changes</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DoorClosedIcon size={16} />
              <span>Close ledger</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageLayout>
    );
}