import { useEffect, useRef, useState } from "react"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { model } from "../../../wailsjs/go/models"
import { useConfigData } from "./use-config-data"
import { SystemConfig } from "./system-config"
import { FofaWebTokenConfig } from "./fofa-web-token-config"
import { AccountCard } from "./account-card"
import { AddAccountDialog } from "./add-account-dialog"
import { EditRemarkDialog } from "./edit-remark-dialog"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"

export function ConfigView() {
  const { accounts, config, loading, refresh, setAccounts, setConfig } = useConfigData()
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<model.FofaAccount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<model.FofaAccount | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // 进入配置页时若账号列表为空，自动打开新增框（本次挂载只触发一次，关掉后不重复弹）
  const autoOpenedRef = useRef(false)
  useEffect(() => {
    if (!loading && !autoOpenedRef.current && accounts.length === 0) {
      autoOpenedRef.current = true
      setAddOpen(true)
    }
  }, [loading, accounts.length])

  const validAccounts = accounts.filter((a) => a.status === "valid")

  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      await refresh()
      toast.success("已刷新")
    } catch (e) {
      toast.error("刷新失败", { description: String(e) })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">配置</h2>
          <p className="text-sm text-muted-foreground">管理 FOFA 账号、API 地址与 key 使用模式</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefreshAll} disabled={refreshing}>
            <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
            刷新
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            新增账号
          </Button>
        </div>
      </div>

      {loading || !config ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <SystemConfig
            config={config}
            setConfig={setConfig}
            validAccounts={validAccounts}
          />

          <FofaWebTokenConfig config={config} setConfig={setConfig} />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">账号列表</h3>
              <span className="text-xs text-muted-foreground">
                共 {accounts.length} 个，有效 {validAccounts.length} 个
              </span>
            </div>

            {accounts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                还没有账号，点击右上角“新增账号”添加第一个 FOFA key
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {accounts.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    setAccounts={setAccounts}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <AddAccountDialog open={addOpen} onOpenChange={setAddOpen} setAccounts={setAccounts} />
      <EditRemarkDialog
        account={editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        setAccounts={setAccounts}
      />
      <DeleteConfirmDialog
        account={deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        setAccounts={setAccounts}
      />
    </div>
  )
}
