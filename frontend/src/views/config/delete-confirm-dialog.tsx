import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteAccount, removeAccount } from "./use-config-data"
import { model } from "../../../wailsjs/go/models"

export function DeleteConfirmDialog({
  account,
  onOpenChange,
  setAccounts,
}: {
  account: model.FofaAccount | null
  onOpenChange: (v: boolean) => void
  setAccounts: React.Dispatch<React.SetStateAction<model.FofaAccount[]>>
}) {
  const [deleting, setDeleting] = useState(false)
  const open = account !== null

  const handleConfirm = async () => {
    if (!account) return
    setDeleting(true)
    try {
      await deleteAccount(account.id)
      removeAccount(setAccounts, account.id)
      toast.success("已删除账号", { description: account.email })
      onOpenChange(false)
    } catch (e) {
      toast.error("删除失败", { description: String(e).replace(/^Error:\s*/i, "") })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>删除账号</DialogTitle>
          <DialogDescription>
            确认删除账号 <span className="font-medium text-foreground">{account?.email || `Key·${account?.key?.slice(0, 8)}…`}</span> 吗？此操作不可撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={deleting}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
            {deleting ? "删除中..." : "删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
