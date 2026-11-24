import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_dashboard/budget")({
  // The overview, budget and calendar are for pro parents.
  beforeLoad: ({ context }) => {
    if (!context.viewer.isPro) throw redirect({ to: "/chores/plan" })
  },
  staticData: { title: "Budget" },
  component: Outlet,
})
