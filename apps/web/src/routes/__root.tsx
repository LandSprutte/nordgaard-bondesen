import * as React from "react"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import appCss from "@workspace/ui/globals.css?url"
import gameCss from "@/styles/game.css?url"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Tjansetogt",
      },
      // Installable as an app (PWA).
      { name: "theme-color", content: "#0b1d33" },
      { name: "application-name", content: "Tjansetogt" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Tjansetogt" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "default",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: gameCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <ServiceWorker />
        <Scripts />
      </body>
    </html>
  )
}

/**
 * Registers the service worker that makes the app installable and shows an
 * offline page. Only in production builds, so development never serves
 * stale files.
 */
function ServiceWorker() {
  React.useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch((err: unknown) => {
      console.error("[pwa] service worker failed to register", err)
    })
  }, [])
  return null
}
