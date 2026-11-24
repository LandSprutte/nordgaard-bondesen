import { createFileRoute, redirect } from "@tanstack/react-router"

/** Moved to the chores app. */
export const Route = createFileRoute("/_dashboard/chores/treasure")({
  beforeLoad: () => {
    throw redirect({ to: "/togt/skat", replace: true })
  },
})
