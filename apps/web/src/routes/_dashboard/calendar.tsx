import { createFileRoute, redirect } from "@tanstack/react-router"

import { PagePlaceholder } from "@/components/page-placeholder"

export const Route = createFileRoute("/_dashboard/calendar")({
  // The overview, budget and calendar are for pro parents.
  beforeLoad: ({ context }) => {
    if (!context.viewer.isPro) throw redirect({ to: "/chores/plan" })
  },
  staticData: { title: "Calendar" },
  component: () => (
    <PagePlaceholder
      title="Calendar"
      description="Upcoming events, birthdays and bills."
    />
  ),
})
