// 国家/地区名称 ↔ 代码映射（表格 LocationCell 与查询页聚合面板共用）
export const COUNTRY_CODES: Array<[string, string]> = [
  ["中国香港", "HK"],
  ["中国台湾", "TW"],
  ["中国澳门", "MO"],
  ["中国", "CN"],
  ["美国", "US"],
  ["日本", "JP"],
  ["韩国", "KR"],
  ["朝鲜", "KP"],
  ["德国", "DE"],
  ["法国", "FR"],
  ["英国", "GB"],
  ["俄罗斯", "RU"],
  ["新加坡", "SG"],
  ["印度", "IN"],
  ["加拿大", "CA"],
  ["澳大利亚", "AU"],
  ["巴西", "BR"],
  ["荷兰", "NL"],
  ["意大利", "IT"],
  ["西班牙", "ES"],
  ["葡萄牙", "PT"],
  ["越南", "VN"],
  ["泰国", "TH"],
  ["马来西亚", "MY"],
  ["印度尼西亚", "ID"],
  ["菲律宾", "PH"],
  ["土耳其", "TR"],
  ["阿联酋", "AE"],
  ["沙特阿拉伯", "SA"],
  ["以色列", "IL"],
  ["伊朗", "IR"],
  ["伊拉克", "IQ"],
  ["乌克兰", "UA"],
  ["波兰", "PL"],
  ["瑞典", "SE"],
  ["瑞士", "CH"],
  ["奥地利", "AT"],
  ["比利时", "BE"],
  ["芬兰", "FI"],
  ["丹麦", "DK"],
  ["挪威", "NO"],
  ["捷克", "CZ"],
  ["罗马尼亚", "RO"],
  ["匈牙利", "HU"],
  ["希腊", "GR"],
  ["墨西哥", "MX"],
  ["阿根廷", "AR"],
  ["智利", "CL"],
  ["哥伦比亚", "CO"],
  ["秘鲁", "PE"],
  ["南非", "ZA"],
  ["埃及", "EG"],
  ["尼日利亚", "NG"],
  ["肯尼亚", "KE"],
  ["摩洛哥", "MA"],
  ["巴基斯坦", "PK"],
  ["孟加拉国", "BD"],
  ["哈萨克斯坦", "KZ"],
  ["蒙古", "MN"],
]

/** 国家代码（如 CN）→「中国 CN」；传入已经是名称时原样返回。 */
export function countryLabel(value: string): string {
  const v = value.trim()
  if (!v) return ""
  const upper = v.toUpperCase()
  const match = COUNTRY_CODES.find(([, code]) => code === upper)
  return match ? `${match[0]} ${match[1]}` : v
}

/** 国家代码或名称 → 两字母代码，用于拼接 FOFA 查询条件。 */
export function countryCode(value: string): string {
  const v = value.trim()
  if (!v) return ""
  const upper = v.toUpperCase()
  if (COUNTRY_CODES.some(([, code]) => code === upper)) return upper
  const match = COUNTRY_CODES.find(([name]) => v.includes(name))
  return match ? match[1] : v
}
