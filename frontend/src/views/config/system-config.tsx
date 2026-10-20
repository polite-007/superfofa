import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { saveKeyConfig, type KeyConfig } from "./use-config-data"
import { model } from "../../../wailsjs/go/models"

const MODE_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: "sequence", label: "顺序轮询", desc: "按存储顺序依次使用有效账号" },
  { value: "single", label: "单 key 运行", desc: "固定使用选定的一个账号" },
  { value: "multi", label: "多 key 随机", desc: "每次请求从有效账号中随机选一个" },
]

export function SystemConfig({
  config,
  setConfig,
  validAccounts,
}: {
  config: KeyConfig
  setConfig: React.Dispatch<React.SetStateAction<KeyConfig | null>>
  validAccounts: model.FofaAccount[]
}) {
  const [baseUrl, setBaseUrl] = useState(config.base_url)
  const [proxy, setProxy] = useState(config.proxy)
  const [saving, setSaving] = useState(false)
  const [modeBusy, setModeBusy] = useState(false)

  useEffect(() => {
    setBaseUrl(config.base_url)
    setProxy(config.proxy)
  }, [config.base_url, config.proxy])

  const handleSaveNetwork = async () => {
    setSaving(true)
    try {
      const next = { ...config, base_url: baseUrl.trim(), proxy: proxy.trim() }
      const saved = await saveKeyConfig(next)
      setConfig(saved)
      toast.success("API 地址 / 代理已保存")
    } catch (e) {
      toast.error("保存失败", { description: String(e) })
    } finally {
      setSaving(false)
    }
  }

  const handleModeChange = async (mode: string) => {
    setModeBusy(true)
    try {
      const next = {
        ...config,
        mode: mode as model.KeyConfig["mode"],
        // multi 模式按 UI 说明使用全部有效账号，清掉残留的 pool_ids 避免指向已失效账号
        pool_ids: mode === "multi" ? [] : config.pool_ids,
      }
      const saved = await saveKeyConfig(next)
      setConfig(saved)
      toast.success("使用模式已切换", { description: MODE_OPTIONS.find((o) => o.value === mode)?.label })
    } catch (e) {
      toast.error("切换模式失败", { description: String(e) })
    } finally {
      setModeBusy(false)
    }
  }

  const handlePickSingle = async (id: string) => {
    try {
      const saved = await saveKeyConfig({ ...config, single_id: id })
      setConfig(saved)
    } catch (e) {
      toast.error("设置单 key 失败", { description: String(e) })
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 ring-1 ring-foreground/10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        {/* 左：系统配置（API 地址 / 代理） */}
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold">系统配置</h3>
            <p className="text-xs text-muted-foreground">FOFA API 地址与代理</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cfg-baseurl">API 地址</Label>
            <Input
              id="cfg-baseurl"
              placeholder="https://fofa.info"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cfg-proxy">代理地址</Label>
            <Input
              id="cfg-proxy"
              placeholder="http://127.0.0.1:7890 或 socks5://..."
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={handleSaveNetwork} disabled={saving}>
              <Save className="size-4" />
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>

        {/* 竖向分隔线（桌面端）：右栏左边框 */}
        {/* 右：使用模式 */}
        <div className="flex flex-col gap-4 md:border-l md:pl-8">
          <div>
            <h3 className="text-sm font-semibold">使用模式</h3>
            <p className="text-xs text-muted-foreground">key 选取策略</p>
          </div>

          <div className="flex flex-col gap-2">
            <Select value={config.mode} onValueChange={handleModeChange} disabled={modeBusy}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start" sideOffset={4}>
                {MODE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {MODE_OPTIONS.find((o) => o.value === config.mode)?.desc}
            </p>
          </div>

          {config.mode === "single" && (
            <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
              <Label className="text-xs text-muted-foreground">选定固定使用的 key</Label>
              {validAccounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无有效账号，请先添加并检测</p>
              ) : (
                <RadioGroup
                  value={config.single_id}
                  onValueChange={handlePickSingle}
                  className="flex flex-col gap-2"
                >
                  {validAccounts.map((a) => (
                    <div key={a.id} className="flex items-center gap-2">
                      <RadioGroupItem value={a.id} id={`single-${a.id}`} />
                      <label htmlFor={`single-${a.id}`} className="text-sm">
                        {a.email || `Key·${a.key.slice(0, 8)}…`}
                        {a.remark && <span className="ml-2 text-xs text-muted-foreground">· {a.remark}</span>}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          )}

          {config.mode === "multi" && (
            <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                多 key 随机模式将从全部{" "}
                <span className="font-medium text-foreground">{validAccounts.length}</span>{" "}
                个有效账号中随机选取使用，分散请求压力，无需手动选择。
              </p>
              {validAccounts.length === 0 && (
                <p className="text-xs text-amber-400">暂无有效账号，请先添加并检测。</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
