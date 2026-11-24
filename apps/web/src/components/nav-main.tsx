import { Link, useLocation } from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"

import type { LinkProps } from "@tanstack/react-router"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar"

export type NavSubItem = {
  title: string
  to: LinkProps["to"]
  params?: LinkProps["params"]
  /** The resolved path, when `to` has params. Also active on its sub-pages. */
  path?: string
  icon?: React.ReactNode
}

export type NavMainItem = {
  title: string
  to: LinkProps["to"]
  icon?: React.ReactNode
  items?: Array<NavSubItem>
}

export function NavMain({ items }: { items: Array<NavMainItem> }) {
  const pathname = useLocation({ select: (l) => l.pathname })

  const isActive = (item: NavSubItem) =>
    item.path
      ? pathname === item.path || pathname.startsWith(`${item.path}/`)
      : pathname === item.to
  const isSectionActive = (to: LinkProps["to"]) =>
    to === "/" ? pathname === "/" : pathname.startsWith(String(to))

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.items?.length ? (
            <Collapsible
              key={item.title}
              defaultOpen={isSectionActive(item.to)}
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger
                render={
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isSectionActive(item.to)}
                  />
                }
              >
                {item.icon}
                <span>{item.title}</span>
                <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.path ?? subItem.title}>
                      <SidebarMenuSubButton
                        isActive={isActive(subItem)}
                        render={
                          <Link
                            to={subItem.to}
                            params={subItem.params}
                            activeOptions={{ exact: true }}
                          />
                        }
                      >
                        {subItem.icon}
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isSectionActive(item.to)}
                render={<Link to={item.to} />}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
