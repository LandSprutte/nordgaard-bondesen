import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { AppBreadcrumbs } from "@/components/app-breadcrumbs"
import { AppSidebar } from "@/components/app-sidebar"
import { getViewer } from "@/server/auth"
import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"

/** The dashboard is for parents; children go to the game. */
export const Route = createFileRoute("/_dashboard")({
  beforeLoad: async () => {
    const viewer = await getViewer()
    if (viewer?.kind === "admin") throw redirect({ to: "/admin" })
    if (!viewer) throw redirect({ to: "/login" })
    if (!viewer.isParent) throw redirect({ to: "/togt" })
    return { viewer }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const { viewer } = Route.useRouteContext()
  return (
    <SidebarProvider>
      <AppSidebar
        family={viewer.family}
        user={viewer.member}
        isPro={viewer.isPro}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <AppBreadcrumbs />
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
