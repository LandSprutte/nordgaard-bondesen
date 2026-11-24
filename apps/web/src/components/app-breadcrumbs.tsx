import * as React from "react"
import { Link, useMatches } from "@tanstack/react-router"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"

/**
 * Builds breadcrumbs from every matched route that declares
 * `staticData.title`, or returns a `crumb` from its loader (for titles that
 * come from data, like a chore's name).
 */
export function AppBreadcrumbs() {
  const crumbs = useMatches({
    select: (matches) =>
      matches.flatMap((match) => {
        const title = match.staticData.title ?? crumbOf(match.loaderData)
        return title ? [{ id: match.id, title, pathname: match.pathname }] : []
      }),
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <React.Fragment key={crumb.id}>
              {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem
                className={isLast ? undefined : "hidden md:block"}
              >
                {isLast ? (
                  <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={
                      <Link
                        to={crumb.pathname}
                        activeOptions={{ exact: true }}
                      />
                    }
                  >
                    {crumb.title}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function crumbOf(loaderData: unknown): string | undefined {
  if (loaderData && typeof loaderData === "object" && "crumb" in loaderData) {
    const { crumb } = loaderData
    return typeof crumb === "string" ? crumb : undefined
  }
  return undefined
}
