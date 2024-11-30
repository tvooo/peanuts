import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLedger } from "@/utils/useLedger";
import { get } from "idb-keyval";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export const OpenPage = () => {
    const { ledger, openLedger, fileHandle } = useLedger();
    const navigate = useNavigate();
    const [files, setFiles] = useState<FileSystemFileHandle[]>([]);

    useEffect(() => {
      if(ledger) {
        navigate("/budget")
      }
    }, [ledger])

    useEffect(() => {
      get(`peanuts:ledgerFileHandle`).then(fileHandle => (
        setFiles([fileHandle])
      ))
    }, [])

    return (
      <main className="flex grow items-center justify-center min-h-screen">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Open or Create Ledger</CardTitle>
            <CardDescription>
              Deploy your new project in one-click.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* <h1>Open Page</h1> */}
            <div className="text-sm font-semibold">Recently opened</div>
            {files.map((fileHandle, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 hover:bg-muted"
              >
                {/* <div className="flex items-center gap-2"> */}
                  <div className="text-sm">{fileHandle.name}</div>
                  <Button onClick={() => openLedger(fileHandle)} size="icon" variant="outline" className="ml-auto">
                    <ChevronRight />
                  </Button>
                </div>
            //   </div>
            ))}

            <Button onClick={() => openLedger()}>Open Ledger</Button>
          </CardContent>
        </Card>
      </main>
    );
}