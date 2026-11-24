import * as React from "react"
import {
  CalendarDaysIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  Settings2Icon,
  WalletIcon,
} from "lucide-react"

import type { NavMainItem } from "@/components/nav-main"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { FamilyHeader } from "@/components/family-header"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

const baseNav: Array<NavMainItem> = [
  {
    title: "Overview",
    to: "/",
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "Budget",
    to: "/budget",
    icon: <WalletIcon />,
    items: [
      { title: "Summary", to: "/budget" },
      { title: "Income", to: "/budget/income" },
      { title: "Expenses", to: "/budget/expenses" },
      { title: "Spending", to: "/budget/spending" },
      { title: "Import", to: "/budget/import" },
    ],
  },
  {
    title: "Tjanser",
    to: "/chores/plan",
    icon: <ListChecksIcon />,
    items: [
      { title: "Åbn Tjansetogt ↗", to: "/togt" },
      { title: "Planlæg togt", to: "/chores/plan" },
    ],
  },
  {
    title: "Calendar",
    to: "/calendar",
    icon: <CalendarDaysIcon />,
  },
  {
    title: "Settings",
    to: "/settings",
    icon: <Settings2Icon />,
    items: [
      { title: "General", to: "/settings" },
      { title: "Besætningen", to: "/settings/family" },
      { title: "Tjanse-arkivet", to: "/settings/chores" },
      { title: "Budget", to: "/settings/budget" },
      { title: "Skatte", to: "/settings/treasures" },
    ],
  },
]

/** Pages only pro parents can open. */
const PRO_ONLY = new Set<string>([
  "/",
  "/budget",
  "/calendar",
  "/settings/budget",
])

/** The menu without pro pages, for basic parents. */
function basicNav(items: Array<NavMainItem>): Array<NavMainItem> {
  return items
    .filter((item) => !PRO_ONLY.has(String(item.to)))
    .map((item) => ({
      ...item,
      items: item.items?.filter((sub) => !PRO_ONLY.has(String(sub.to))),
    }))
}

export function AppSidebar({
  family,
  user,
  isPro,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  family: { name: string }
  user: React.ComponentProps<typeof NavUser>["user"]
  isPro: boolean
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <FamilyHeader name={family.name} isPro={isPro} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={isPro ? baseNav : basicNav(baseNav)} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
