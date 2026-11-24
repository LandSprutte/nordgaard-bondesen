import togtCss from "@/styles/togt.css?url"

/** Fonts and styles for the app-like pages (the game and the logins). */
export const togtLinks = [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous" as const,
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Bangers&family=Bungee&family=Nunito:wght@500;700;800;900&family=Pirata+One&family=Righteous&display=swap",
  },
  { rel: "stylesheet", href: togtCss },
]

export const togtMeta = [
  {
    name: "viewport",
    content: "width=device-width, initial-scale=1, viewport-fit=cover",
  },
]
