import { createFileRoute } from "@tanstack/react-router"

import { PagePlaceholder } from "@/components/page-placeholder"

export const Route = createFileRoute("/_dashboard/settings/")({
  component: () => (
    <PagePlaceholder
      title="Settings"
      description="Preferences for the dashboard."
    />
  ),
})
