import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_dashboard/budget")({
  staticData: { title: "Budget" },
  component: Outlet,
})
