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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addAccount, upsertAccount } from "./use-config-data"
import { model } from "../../../wailsjs/go/models"

export function AddAccountDialog({
  open,
  onOpenChange,
  setAccounts,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  setAccounts: React.Dispatch<React.SetStateAction<model.FofaAccount[]>>
}) {
  const [email, setEmail] = useState("")
  const [key, setKey] = useState("")
  const [remark, setRemark] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail("")
      setKey("")
      setRemark("")
    }
  }, [open])

  const valid = key.trim() !== "" && (email.trim() === "" || email.includes("@"))

  const handleSubmit = async () => {
    if (!valid) return
    setSubmitting(true)
    try {
      const acc = await addAccount({
        email: email.trim(),
        key: key.trim(),
        remark: remark.trim(),
      } as model.AddAccountReq)
      upsertAccount(setAccounts, acc)
      toast.success("账号已添加", { description: `${acc.email || acc.remark || "新账号"} 检测通过并已入库` })
      onOpenChange(false)
    } catch (e) {
      const msg = String(e).replace(/^Error:\s*/i, "")
      // 后端区分了 invalid / error 两类文案，直接展示
      toast.error("添加失败", { description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新增 FOFA 账号</DialogTitle>
          <DialogDescription>
            填写 API Key 和注释（邮箱可选），确认后将联网检测，通过后才会加入账号列表。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-email">邮箱（可选）</Label>
            <Input
              id="add-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-key">API Key</Label>
            <Input
              id="add-key"
              placeholder="FOFA API Key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-remark">注释（可选）</Label>
            <Textarea
              id="add-remark"
              placeholder="给这个账号加个备注，方便区分"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
              disabled={submitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || submitting}>
            {submitting ? "检测中..." : "确认并检测"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
