import { useEffect, useState } from "react"
import { Minus, Maximize2, Minimize2, X, Sun, Moon, Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/hooks/use-theme"
import { VersionDialog } from "@/views/version/version-dialog"
import { CheckUpdateButton } from "@/views/version/check-update"
import {
  WindowMinimise,
  WindowToggleMaximise,
  BrowserOpenURL,
  EventsOn,
  EventsOff,
} from "../../wailsjs/runtime/runtime"
import { RequestQuit } from "../../wailsjs/go/app/App"

const GITHUB_URL = "https://github.com/polite-007/superfofa"

const SLOGANS = [
  "喜欢的话给我点个star吧",
  "网络安全就是国家安全",
  "fofa就是最x的",
  "天才开发工程师陨落",
  "麻烦给我个fofa-key吧"
]

export function TitleBar() {
  const [maximised, setMaximised] = useState(false)
  const [sloganIndex, setSloganIndex] = useState(0)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    // 监听 Wails 窗口最大化/还原事件，同步图标状态
    const onMax = () => setMaximised(true)
    const onUnmax = () => setMaximised(false)
    EventsOn("wails:window:maximised", onMax)
    EventsOn("wails:window:unmaximised", onUnmax)
    return () => {
      EventsOff("wails:window:maximised")
      EventsOff("wails:window:unmaximised")
    }
  }, [])

  return (
    <div
      className="wails-drag flex h-9 shrink-0 items-center justify-between border-b border-border bg-background/80 px-2 backdrop-blur select-none"
      onDoubleClick={() => WindowToggleMaximise()}
    >
      {/* 左侧：标题 + 标语 */}
      <div
        className="flex items-center gap-2 px-2"
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-medium text-foreground/80">
          super-fofa
        </span>
        <Separator orientation="vertical" className="h-7" />
        <Button
          variant="ghost"
          size="sm"
          title="点击切换标语"
          onClick={() => setSloganIndex((i) => (i + 1) % SLOGANS.length)}
          className="wails-drag-none h-7 px-2 text-xs text-foreground/55 hover:text-foreground/80"
        >
          {SLOGANS[sloganIndex]}
        </Button>
      </div>

      {/* 右侧：版本日志 + 主题切换 + GitHub + 窗口控制 */}
      <div
        className="flex items-center gap-0.5"
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <CheckUpdateButton />
        <VersionDialog />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="切换主题"
          title={theme === "dark" ? "切换到浅色" : "切换到深色"}
          onClick={toggle}
          className="wails-drag-none"
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="GitHub"
          title="GitHub 仓库"
          onClick={() => BrowserOpenURL(GITHUB_URL)}
          className="wails-drag-none"
        >
          <Github />
        </Button>
        <Separator orientation="vertical" className="mx-2 h-7" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="最小化"
          onClick={() => WindowMinimise()}
          className="wails-drag-none"
        >
          <Minus />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={maximised ? "还原" : "最大化"}
          onClick={() => WindowToggleMaximise()}
          className="wails-drag-none"
        >
          {maximised ? <Minimize2 /> : <Maximize2 />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="关闭"
          onClick={() => RequestQuit()}
          className="wails-drag-none hover:bg-destructive hover:text-destructive-foreground"
        >
          <X />
        </Button>
      </div>
    </div>
  )
}
