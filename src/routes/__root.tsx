import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import appCss from "../styles.css?url";
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HodgeForm — Trust compiler for AI work" },
      { name: "description", content: "HodgeForm compiles changes in AI authority into frozen evidence obligations and signed release decisions." },
      { property: "og:title", content: "HodgeForm — Trust compiler for AI work" },
      { property: "og:description", content: "Models propose. Evidence establishes. Policy decides." },
      { property: "og:image", content: "/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#090b0d" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
    ],
    links: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }, { rel: "stylesheet", href: appCss }],
  }),
  component: Root,
});
function Root() { return <html lang="en" className="antialiased"><head><HeadContent /></head><body><AppShell><Outlet /></AppShell><Scripts /></body></html>; }
