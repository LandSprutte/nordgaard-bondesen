import { createFileRoute, redirect } from "@tanstack/react-router"

/** Moved to the chores app. */
export const Route = createFileRoute("/_dashboard/chores/log")({
  beforeLoad: () => {
    throw redirect({ to: "/togt/log", replace: true })
  },
})
