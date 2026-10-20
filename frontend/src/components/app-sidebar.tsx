import { Search, Globe, BarChart3, Download, Settings, ChevronsLeft, ChevronsRight } from "lucide-react"
import appicon from "@/assets/images/appicon.png"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { CHANGELOG } from "../views/version/changelog"


export type MenuKey = "query" | "host" | "aggregate" | "export" | "config"

const menus: { key: MenuKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "query", label: "查询", icon: Search },
  { key: "aggregate", label: "统计", icon: BarChart3 },
  { key: "host", label: "主机", icon: Globe },
  { key: "export", label: "导出", icon: Download },
  { key: "config", label: "配置", icon: Settings },
]

// 侧边栏底部：展开时显示 appicon + 名称/版本 + 收起箭头；收起时只显示展开箭头
function SidebarToggle() {
  const { toggleSidebar, state } = useSidebar()
  const collapsed = state === "collapsed"
  return (
    <button
      onClick={toggleSidebar}
      title={collapsed ? "展开侧边栏" : "收起侧边栏"}
      aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
      className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
    >
      {/* 展开时：appicon + 名称 + 版本 + 收起箭头 */}
      <img
        src={appicon}
        alt="Super FOFA"
        className="size-7 shrink-0 rounded-md group-data-[collapsible=icon]:hidden"
      />
      <div className="flex flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
        <span className="text-xs font-semibold leading-tight truncate">
          Super FOFA
        </span>
        <span className="text-[10px] leading-tight text-sidebar-foreground/50">
          {CHANGELOG[0].version}
        </span>
      </div>
      <ChevronsLeft className="size-4 shrink-0 text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden" />
      {/* 收起时：展开箭头 */}
      <ChevronsRight className="hidden size-5 shrink-0 text-sidebar-foreground/60 group-data-[collapsible=icon]:flex" />
    </button>
  )
}

export function AppSidebar({
  active,
  onSelect,
}: {
  active: MenuKey
  onSelect: (key: MenuKey) => void
}) {
  return (
    <Sidebar collapsible="icon" className="absolute inset-y-0 h-full">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>功能</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menus.map((m) => (
                <SidebarMenuItem key={m.key}>
                  <SidebarMenuButton
                    isActive={active === m.key}
                    tooltip={m.label}
                    onClick={() => onSelect(m.key)}
                  >
                    <m.icon />
                    <span>{m.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="ml-1 mr-2" />

      <SidebarFooter className="p-2">
        <SidebarToggle />
      </SidebarFooter>
    </Sidebar>
  )
}
