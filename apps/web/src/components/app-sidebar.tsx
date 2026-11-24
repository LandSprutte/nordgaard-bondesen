import * as React from "react"
import {
  CalendarDaysIcon,
  HomeIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  Settings2Icon,
  WalletIcon,
} from "lucide-react"

import type { NavMainItem } from "@/components/nav-main"
import type { Household } from "@/components/household-switcher"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { HouseholdSwitcher } from "@/components/household-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

// Placeholder data until we have persistence / auth.
const households: Array<Household> = [
  { name: "Our Family", logo: <HomeIcon />, description: "Household" },
]

const user = {
  name: "Family Member",
  email: "family@example.com",
  avatar: "",
}

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
    to: "/chores",
    icon: <ListChecksIcon />,
    items: [
      { title: "Ugens togt", to: "/chores" },
      { title: "Planlæg næste togt", to: "/chores/plan" },
      { title: "Skattekisten", to: "/chores/treasure" },
      { title: "Logbogen", to: "/chores/log" },
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

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <HouseholdSwitcher households={households} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={baseNav} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
