import { createFileRoute } from "@tanstack/react-router"

import { PagePlaceholder } from "@/components/page-placeholder"

export const Route = createFileRoute("/_dashboard/calendar")({
  staticData: { title: "Calendar" },
  component: () => (
    <PagePlaceholder
      title="Calendar"
      description="Upcoming events, birthdays and bills."
    />
  ),
})
