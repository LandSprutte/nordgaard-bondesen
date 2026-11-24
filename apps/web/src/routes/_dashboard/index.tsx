import { createFileRoute } from "@tanstack/react-router"

import { PagePlaceholder } from "@/components/page-placeholder"

export const Route = createFileRoute("/_dashboard/")({
  staticData: { title: "Overview" },
  component: () => (
    <PagePlaceholder
      title="Overview"
      description="A snapshot of everything happening in the family."
    />
  ),
})
