import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_dashboard/chores")({
  staticData: { title: "Tjanser" },
  component: Outlet,
})
