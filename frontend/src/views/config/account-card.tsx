import { useState } from "react"
import { Eye, EyeOff, Pencil, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { model } from "../../../wailsjs/go/models"
import { StatusBadge } from "./status-badge"
import { checkAccount, deleteAccount, upsertAccount, removeAccount } from "./use-config-data"
import { cn } from "@/lib/utils"

function QuotaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium tabular-nums">{value}</span>
    </div>
  )
}

export function AccountCard({
  account,
  setAccounts,
  onEdit,
  onDelete,
}: {
  account: model.FofaAccount
  setAccounts: React.Dispatch<React.SetStateAction<model.FofaAccount[]>>
  onEdit: (acc: model.FofaAccount) => void
  onDelete: (acc: model.FofaAccount) => void
}) {
  const [showKey, setShowKey] = useState(false)
  const [checking, setChecking] = useState(false)

  const handleCheck = async () => {
    setChecking(true)
    try {
      const updated = await checkAccount(account.id)
      upsertAccount(setAccounts, updated)
      if (updated.status === "valid") {
        toast.success("检测成功", { description: `${updated.email} 当前有效` })
      } else if (updated.status === "invalid") {
        toast.error("key 无效", { description: updated.err_msg })
      } else {
        toast.error("检测失败", { description: updated.err_msg })
      }
    } catch (e) {
      toast.error("检测出错", { description: String(e) })
    } finally {
      setChecking(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteAccount(account.id)
      removeAccount(setAccounts, account.id)
      toast.success("已删除账号", { description: account.email })
    } catch (e) {
      toast.error("删除失败", { description: String(e) })
    }
  }

  const snap = account.account
  const lastCheck = account.last_check
    ? new Date(account.last_check).toLocaleString("zh-CN", { hour12: false })
    : "—"

  return (
    <Card className="gap-0">
      <CardHeader className="gap-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {account.email || `Key·${account.key.slice(0, 8)}…`}
              </span>
              <StatusBadge status={account.status} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="inline-flex items-center gap-1 font-mono hover:text-foreground"
                title={showKey ? "隐藏 key" : "显示 key"}
              >
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span>{showKey ? account.key : "••••••••••••"}</span>
              </button>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleCheck}
              disabled={checking}
              title="联网检查"
            >
              <RefreshCw className={cn("size-4", checking && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(account)} title="编辑注释">
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(account)}
              title="删除"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 pb-3">
        {account.remark && (
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground/70">注释：</span>
            {account.remark}
          </p>
        )}

        {account.status !== "valid" && account.err_msg && (
          <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">{account.err_msg}</p>
        )}

        {snap ? (
          <div className="grid grid-cols-3 gap-x-3 gap-y-2 rounded-md bg-muted/40 p-3">
            <QuotaItem label="VIP 等级" value={snap.isvip ? `V${snap.vip_level}` : "非 VIP"} />
            <QuotaItem label="剩余查询" value={snap.remain_api_query} />
            <QuotaItem label="剩余数据" value={snap.remain_api_data} />
            <QuotaItem label="F 币" value={snap.fcoin} />
            <QuotaItem label="F 点" value={snap.fofa_point} />
            <QuotaItem label="免费点数" value={snap.remain_free_point} />
            <QuotaItem label="用户类别" value={snap.category || "—"} />
            <QuotaItem label="认证状态" value={snap.is_verified ? "已认证" : "未认证"} />
            <QuotaItem label="上次检测" value={lastCheck} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">暂无额度信息，点击右上角刷新图标联网检测</p>
        )}
      </CardContent>
    </Card>
  )
}
