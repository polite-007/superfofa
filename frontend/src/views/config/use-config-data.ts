import { useCallback, useEffect, useState } from "react"
import {
  ListFofaAccounts,
  CheckFofaAccount,
  DeleteFofaAccount,
  AddFofaAccount,
  UpdateFofaAccount,
  GetKeyConfig,
  SetKeyConfig,
  SetFofaWebToken,
} from "../../../wailsjs/go/app/App"
import { model } from "../../../wailsjs/go/models"

export type AccountList = model.FofaAccount[]
export type KeyConfig = model.KeyConfig

export function useConfigData() {
  const [accounts, setAccounts] = useState<AccountList>([])
  const [config, setConfig] = useState<KeyConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [accs, cfg] = await Promise.all([ListFofaAccounts(), GetKeyConfig()])
    setAccounts(accs || [])
    setConfig(cfg)
    return { accs, cfg }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        await refresh()
      } catch (e) {
        console.error("加载配置数据失败", e)
      } finally {
        setLoading(false)
      }
    })()
  }, [refresh])

  return { accounts, config, loading, refresh, setAccounts, setConfig }
}

// 单点更新某账号在列表中的状态（检测/编辑后用，避免全量刷新）
export function upsertAccount(setAccounts: React.Dispatch<React.SetStateAction<AccountList>>, acc: model.FofaAccount) {
  setAccounts((prev) => {
    const idx = prev.findIndex((a) => a.id === acc.id)
    if (idx === -1) return [...prev, acc]
    const next = prev.slice()
    next[idx] = acc
    return next
  })
}

export function removeAccount(setAccounts: React.Dispatch<React.SetStateAction<AccountList>>, id: string) {
  setAccounts((prev) => prev.filter((a) => a.id !== id))
}

// 检测单个账号
export async function checkAccount(id: string): Promise<model.FofaAccount> {
  return CheckFofaAccount(id)
}

// 删除账号
export async function deleteAccount(id: string): Promise<void> {
  return DeleteFofaAccount(id)
}

// 新增账号（含联网检测）
export async function addAccount(req: model.AddAccountReq): Promise<model.FofaAccount> {
  return AddFofaAccount(req)
}

// 编辑注释
export async function updateAccount(req: model.UpdateAccountReq): Promise<model.FofaAccount> {
  return UpdateFofaAccount(req)
}

// 保存系统配置
export async function saveKeyConfig(cfg: KeyConfig): Promise<KeyConfig> {
  return SetKeyConfig(cfg)
}

// 保存 FOFA 用户 Token
export async function setFofaWebToken(token: string): Promise<model.KeyConfig> {
  return SetFofaWebToken(token)
}

export { GetKeyConfig }
