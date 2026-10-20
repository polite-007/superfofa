import { useEffect, useState } from "react"
import { TitleBar } from "@/components/title-bar"
import { AppSidebar, type MenuKey } from "@/components/app-sidebar"
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"
import { QueryView } from "@/views/query"
import { HostView } from "@/views/host"
import { AggregateView } from "@/views/aggregate"
import { ConfigView } from "@/views/config"
import { ExportView } from "@/views/export"

function App() {
  const [active, setActive] = useState<MenuKey>("query")

  useEffect(() => {
    const handler = () => setActive("config")
    window.addEventListener("superfofa:open-config", handler)
    return () => window.removeEventListener("superfofa:open-config", handler)
  }, [])

  useEffect(() => {
    const handler = () => setActive("host")
    window.addEventListener("superfofa:open-host", handler)
    return () => window.removeEventListener("superfofa:open-host", handler)
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TitleBar />
      <SidebarProvider className="relative min-h-0 flex-1">
        <AppSidebar active={active} onSelect={setActive} />
        <SidebarInset className="flex min-w-0 flex-col">
          <main className="min-w-0 flex-1 overflow-hidden">
            <div className={active === "query" ? "h-full" : "hidden"}>
              <QueryView
                onOpenStats={(query) => {
                  setActive("aggregate")
                  window.dispatchEvent(
                    new CustomEvent("superfofa:open-stats-query", {
                      detail: { query, autoRun: true },
                    }),
                  )
                }}
                onOpenExport={(tab) => {
                  setActive("export")
                  window.dispatchEvent(
                    new CustomEvent("superfofa:open-export-tab", {
                      detail: { tab: tab ?? "records" },
                    }),
                  )
                }}
              />
            </div>
<div className={active === "host" ? "h-full" : "hidden"}>
              <HostView />
            </div>
            <div className={active === "aggregate" ? "h-full" : "hidden"}>
              <AggregateView />
            </div>
            {active === "export" && <ExportView />}
            {active === "config" && <ConfigView />}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

export default App
