import { useEffect, useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateAccount, upsertAccount } from "./use-config-data"
import { model } from "../../../wailsjs/go/models"

export function EditRemarkDialog({
  account,
  onOpenChange,
  setAccounts,
}: {
  account: model.FofaAccount | null
  onOpenChange: (v: boolean) => void
  setAccounts: React.Dispatch<React.SetStateAction<model.FofaAccount[]>>
}) {
  const [remark, setRemark] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setRemark(account?.remark ?? "")
  }, [account])

  const open = account !== null

  const handleSubmit = async () => {
    if (!account) return
    setSubmitting(true)
    try {
      const updated = await updateAccount({ id: account.id, remark: remark.trim() } as model.UpdateAccountReq)
      upsertAccount(setAccounts, updated)
      toast.success("注释已更新")
      onOpenChange(false)
    } catch (e) {
      toast.error("更新失败", { description: String(e) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑注释</DialogTitle>
          <DialogDescription>
            仅可修改注释，邮箱和 API Key 不可编辑。账号：{account?.email || `Key·${account?.key?.slice(0, 8)}…`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 py-2">
          <Label htmlFor="edit-remark">注释</Label>
          <Textarea
            id="edit-remark"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={3}
            disabled={submitting}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
