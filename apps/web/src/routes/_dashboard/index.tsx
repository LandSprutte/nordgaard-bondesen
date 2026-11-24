import { createFileRoute, redirect } from "@tanstack/react-router"

import { PagePlaceholder } from "@/components/page-placeholder"

export const Route = createFileRoute("/_dashboard/")({
  // The overview, budget and calendar are for pro parents.
  beforeLoad: ({ context }) => {
    if (!context.viewer.isPro) throw redirect({ to: "/chores/plan" })
  },
  staticData: { title: "Overview" },
  component: () => (
    <PagePlaceholder
      title="Overview"
      description="A snapshot of everything happening in the family."
    />
  ),
})
