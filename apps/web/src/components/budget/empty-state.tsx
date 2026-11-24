import { Link } from "@tanstack/react-router"
import { UploadIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export function NoDataYet() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <p className="font-medium">No transactions for this period yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Export it from your bank as CSV and upload it here.
      </p>
      <Button nativeButton={false} render={<Link to="/budget/import" />}>
        <UploadIcon />
        Import CSV
      </Button>
    </div>
  )
}
