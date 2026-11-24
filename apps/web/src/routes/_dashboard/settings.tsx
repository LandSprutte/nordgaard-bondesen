import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_dashboard/settings")({
  staticData: { title: "Settings" },
  component: Outlet,
})
