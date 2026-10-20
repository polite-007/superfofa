import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// 逻辑连接符
const LOGIC: { op: string; meaning: string; note: string }[] = [
  { op: "=", meaning: "匹配", note: `="" 时可查询不存在字段或值为空的情况` },
  { op: "==", meaning: "完全匹配", note: `=="" 时可查询存在且值为空的情况` },
  { op: "&&", meaning: "与", note: "逻辑与" },
  { op: "||", meaning: "或", note: "逻辑或" },
  { op: "!=", meaning: "不匹配", note: `!="" 时可查询值不为空的情况` },
  { op: "*=", meaning: "模糊匹配", note: "使用 * 或 ? 进行搜索" },
  { op: "()", meaning: "优先级", note: "括号内容优先级最高" },
]

type Row = { syntax: string; example: string; usage: string; eq: boolean; neq: boolean; fuzzy: boolean }

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: "基础类（General）",
    rows: [
      { syntax: "ip", example: 'ip="1.1.1.1"', usage: "通过单一 IPv4 地址查询", eq: true, neq: true, fuzzy: false },
      { syntax: "ip", example: 'ip="220.181.111.1/24"', usage: "通过 IPv4 C 段查询", eq: true, neq: true, fuzzy: false },
      { syntax: "ip", example: 'ip="2600:9000:..."', usage: "通过单一 IPv6 地址查询", eq: true, neq: true, fuzzy: false },
      { syntax: "port", example: 'port="6379"', usage: "通过端口号查询", eq: true, neq: true, fuzzy: true },
      { syntax: "domain", example: 'domain="qq.com"', usage: "通过根域名查询", eq: true, neq: true, fuzzy: true },
      { syntax: "host", example: 'host=".fofa.info"', usage: "通过主机名查询", eq: true, neq: true, fuzzy: true },
      { syntax: "os", example: 'os="centos"', usage: "通过操作系统查询", eq: true, neq: true, fuzzy: true },
      { syntax: "server", example: 'server="Microsoft-IIS/10"', usage: "通过服务器查询", eq: true, neq: true, fuzzy: true },
      { syntax: "asn", example: 'asn="19551"', usage: "通过自治系统号搜索", eq: true, neq: true, fuzzy: true },
      { syntax: "org", example: 'org="LLC Baxet"', usage: "通过所属组织查询", eq: true, neq: true, fuzzy: true },
      { syntax: "is_domain", example: "is_domain=true", usage: "筛选拥有域名的资产", eq: true, neq: false, fuzzy: false },
      { syntax: "is_domain", example: "is_domain=false", usage: "筛选没有域名的资产", eq: true, neq: false, fuzzy: false },
      { syntax: "is_ipv6", example: "is_ipv6=true", usage: "筛选 IPv6 资产", eq: true, neq: false, fuzzy: false },
      { syntax: "is_ipv6", example: "is_ipv6=false", usage: "筛选 IPv4 资产", eq: true, neq: false, fuzzy: false },
    ],
  },
  {
    title: "标记类（Special Label）",
    rows: [
      { syntax: "app", example: 'app="Microsoft-Exchange"', usage: "通过 FOFA 规则查询", eq: true, neq: false, fuzzy: false },
      { syntax: "fid", example: 'fid="sSXXGNUO2FefBTcCLIT/2Q=="', usage: "通过 FOFA 站点指纹查询", eq: true, neq: true, fuzzy: false },
      { syntax: "product", example: 'product="NGINX"', usage: "通过 FOFA 产品名查询", eq: true, neq: true, fuzzy: false },
      { syntax: "product.version", example: 'product="Roundcube" && product.version="1.6.10"', usage: "通过产品版本号查询（商业版+）", eq: true, neq: true, fuzzy: false },
      { syntax: "category", example: 'category="服务"', usage: "通过分类查询（个人版+）", eq: true, neq: true, fuzzy: false },
      { syntax: "type", example: 'type="service"', usage: "筛选协议资产", eq: true, neq: false, fuzzy: false },
      { syntax: "type", example: 'type="subdomain"', usage: "筛选服务（网站类）资产", eq: true, neq: false, fuzzy: false },
      { syntax: "cloud_name", example: 'cloud_name="Aliyundun"', usage: "通过云服务商查询", eq: true, neq: true, fuzzy: true },
      { syntax: "is_cloud", example: "is_cloud=true", usage: "筛选云服务资产", eq: true, neq: false, fuzzy: false },
      { syntax: "is_cloud", example: "is_cloud=false", usage: "筛选非云服务资产", eq: true, neq: false, fuzzy: false },
      { syntax: "is_fraud", example: "is_fraud=true", usage: "筛选仿冒垃圾站群（专业版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "is_honeypot", example: "is_honeypot=true", usage: "筛选蜜罐资产（专业版+）", eq: true, neq: false, fuzzy: false },
    ],
  },
  {
    title: "协议类（type=service）",
    rows: [
      { syntax: "protocol", example: 'protocol="quic"', usage: "通过协议名称查询", eq: true, neq: true, fuzzy: true },
      { syntax: "banner", example: 'banner="users"', usage: "通过协议返回信息查询（注册用户+）", eq: true, neq: true, fuzzy: false },
      { syntax: "banner_hash", example: 'banner_hash="7330105010150477363"', usage: "通过协议响应 hash 查询（个人版+）", eq: true, neq: true, fuzzy: false },
      { syntax: "banner_fid", example: 'banner_fid="zRpqmn0FXQRjZpH8..."', usage: "通过协议返回信息指纹查询（个人版+）", eq: true, neq: true, fuzzy: false },
      { syntax: "base_protocol", example: 'base_protocol="udp"', usage: "查询传输层为 UDP 的资产", eq: true, neq: true, fuzzy: false },
      { syntax: "base_protocol", example: 'base_protocol="tcp"', usage: "查询传输层为 TCP 的资产", eq: true, neq: true, fuzzy: false },
    ],
  },
  {
    title: "网站类（type=subdomain）",
    rows: [
      { syntax: "title", example: 'title="beijing"', usage: "通过网站标题查询", eq: true, neq: true, fuzzy: true },
      { syntax: "header", example: 'header="elastic"', usage: "通过响应标头查询（注册用户+）", eq: true, neq: true, fuzzy: false },
      { syntax: "header_hash", example: 'header_hash="1258854265"', usage: "通过 HTTP(S) 响应头 hash 查询（个人版+）", eq: true, neq: true, fuzzy: true },
      { syntax: "body", example: 'body="网络空间测绘"', usage: "通过 HTML 正文查询（注册用户+）", eq: true, neq: true, fuzzy: false },
      { syntax: "body_hash", example: 'body_hash="-2090962452"', usage: "通过 HTML 正文 hash 查询（个人版+）", eq: true, neq: true, fuzzy: false },
      { syntax: "js_name", example: 'js_name="js/jquery.js"', usage: "通过 HTML 包含的 JS 查询", eq: true, neq: true, fuzzy: true },
      { syntax: "js_md5", example: 'js_md5="82ac3f14327a8b7ba49ba208d4eaa15"', usage: "通过 JS 源码查询", eq: true, neq: true, fuzzy: true },
      { syntax: "cname", example: 'cname="customers.spektrix.com"', usage: "通过别名记录查询", eq: true, neq: true, fuzzy: true },
      { syntax: "cname_domain", example: 'cname_domain="siteforce.com"', usage: "通过别名记录主域名查询", eq: true, neq: true, fuzzy: true },
      { syntax: "icon_hash", example: 'icon_hash="-247388890"', usage: "通过网站图标 hash 查询", eq: true, neq: true, fuzzy: false },
      { syntax: "status_code", example: 'status_code="402"', usage: "筛选状态码为 402 的网站资产", eq: true, neq: true, fuzzy: false },
      { syntax: "icp", example: 'icp="京ICP证030173号"', usage: "通过 ICP 备案号查询", eq: true, neq: true, fuzzy: true },
    ],
  },
  {
    title: "地理位置（Location）",
    rows: [
      { syntax: "country", example: 'country="CN"', usage: "通过国家简称代码查询", eq: true, neq: true, fuzzy: false },
      { syntax: "country", example: 'country="中国"', usage: "通过国家中文名称查询", eq: true, neq: true, fuzzy: false },
      { syntax: "region", example: 'region="Zhejiang"', usage: "通过省份/地区英文名查询", eq: true, neq: true, fuzzy: false },
      { syntax: "region", example: 'region="浙江"', usage: "通过省份/地区中文名查询（仅中国）", eq: true, neq: true, fuzzy: false },
      { syntax: "city", example: 'city="Hangzhou"', usage: "通过城市英文名查询", eq: true, neq: true, fuzzy: false },
    ],
  },
  {
    title: "证书类（Certificate）",
    rows: [
      { syntax: "cert", example: 'cert="baidu"', usage: "通过证书查询（注册用户+）", eq: true, neq: true, fuzzy: false },
      { syntax: "cert.subject", example: 'cert.subject="Oracle Corporation"', usage: "通过证书持有者查询", eq: true, neq: true, fuzzy: true },
      { syntax: "cert.issuer", example: 'cert.issuer="DigiCert"', usage: "通过证书颁发者查询", eq: true, neq: true, fuzzy: true },
      { syntax: "cert.subject.org", example: 'cert.subject.org="Oracle Corporation"', usage: "通过持有者组织查询", eq: true, neq: true, fuzzy: true },
      { syntax: "cert.subject.cn", example: 'cert.subject.cn="baidu.com"', usage: "通过持有者通用名称查询", eq: true, neq: true, fuzzy: true },
      { syntax: "cert.issuer.org", example: 'cert.issuer.org="cPanel, Inc."', usage: "通过颁发者组织查询", eq: true, neq: true, fuzzy: true },
      { syntax: "cert.issuer.cn", example: 'cert.issuer.cn="Synology Inc. CA"', usage: "通过颁发者通用名称查询", eq: true, neq: true, fuzzy: true },
      { syntax: "cert.domain", example: 'cert.domain="huawei.com"', usage: "通过持有者根域名查询", eq: true, neq: true, fuzzy: true },
      { syntax: "cert.is_valid", example: "cert.is_valid=true", usage: "筛选有效证书（个人版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "cert.is_match", example: "cert.is_match=true", usage: "筛选证书与域名匹配（个人版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "cert.is_expired", example: "cert.is_expired=true", usage: "筛选已过期证书（个人版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "jarm", example: 'jarm="2ad2ad0002ad2ad22c..."', usage: "通过 JARM 指纹查询", eq: true, neq: true, fuzzy: true },
      { syntax: "tls.version", example: 'tls.version="TLS 1.3"', usage: "通过 TLS 协议版本查询", eq: true, neq: true, fuzzy: false },
      { syntax: "tls.ja3s", example: 'tls.ja3s="15af977ce25de452b96affa2addb1036"', usage: "通过 TLS JA3S 指纹查询", eq: true, neq: true, fuzzy: true },
    ],
  },
  {
    title: "时间类（Last Update Time）",
    rows: [
      { syntax: "after", example: 'after="2023-01-01"', usage: "筛选某时间后有更新的资产（个人版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "before", example: 'before="2023-12-01"', usage: "筛选某时间前有更新的资产（个人版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "after && before", example: 'after="2023-01-01" && before="2023-12-01"', usage: "筛选时间区间内更新的资产（个人版+）", eq: true, neq: false, fuzzy: false },
    ],
  },
  {
    title: "独立 IP 语法",
    rows: [
      { syntax: "ip_filter()", example: 'ip_filter(banner="SSH-2.0-OpenSSH_6.7p2") && ip_filter(icon_hash="-1057022626")', usage: "同源 IP 多资产特征匹配（商业版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "ip_exclude()", example: 'ip_filter(banner=...) && ip_exclude(title="EdgeOS")', usage: "同源 IP 多资产特征不匹配（商业版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "port_size", example: 'port_size="6"', usage: "开放端口数=6 的独立 IP（商业版+）", eq: true, neq: true, fuzzy: false },
      { syntax: "port_size_gt", example: 'port_size_gt="6"', usage: "开放端口数>6 的独立 IP（商业版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "port_size_lt", example: 'port_size_lt="12"', usage: "开放端口数<12 的独立 IP（商业版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "ip_ports", example: 'ip_ports="80,161"', usage: "同时开放指定端口的独立 IP（商业版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "ip_country", example: 'ip_country="CN"', usage: "通过国家简称查询独立 IP（商业版+）", eq: true, neq: false, fuzzy: false },
      { syntax: "ip_city", example: 'ip_city="Hangzhou"', usage: "通过城市英文名查询独立 IP（商业版+）", eq: true, neq: false, fuzzy: false },
    ],
  },
]

function Mark({ ok }: { ok: boolean }) {
  return ok ? <span className="text-emerald-400">✓</span> : <span className="text-muted-foreground/40">—</span>
}

export function SyntaxHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>FOFA 查询语法参考</DialogTitle>
          <DialogDescription>
            直接输入查询语句，将从标题、HTML 内容、HTTP 头信息、URL 字段中搜索。多与或关系尽量用 () 包含。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* 逻辑连接符 */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">逻辑连接符</h4>
            <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium">连接符</th>
                    <th className="px-3 py-1.5 text-left font-medium">含义</th>
                    <th className="px-3 py-1.5 text-left font-medium">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {LOGIC.map((it) => (
                    <tr key={it.op} className="border-t border-border/60">
                      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-foreground">{it.op}</td>
                      <td className="px-3 py-1.5 text-xs text-foreground/90">{it.meaning}</td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{it.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 各分类 */}
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{sec.title}</h4>
              <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">语法</th>
                      <th className="px-3 py-1.5 text-left font-medium">例句</th>
                      <th className="px-3 py-1.5 text-left font-medium">用途</th>
                      <th className="px-2 py-1.5 text-center font-medium" title="=">=</th>
                      <th className="px-2 py-1.5 text-center font-medium" title="!=">!=</th>
                      <th className="px-2 py-1.5 text-center font-medium" title="*=">*=</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.rows.map((r, i) => (
                      <tr key={`${r.syntax}-${i}`} className="border-t border-border/60">
                        <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-foreground">{r.syntax}</td>
                        <td className="px-3 py-1.5 font-mono text-xs text-emerald-400">{r.example}</td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.usage}</td>
                        <td className="px-2 py-1.5 text-center text-xs"><Mark ok={r.eq} /></td>
                        <td className="px-2 py-1.5 text-center text-xs"><Mark ok={r.neq} /></td>
                        <td className="px-2 py-1.5 text-center text-xs"><Mark ok={r.fuzzy} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <p className="px-1 text-xs text-muted-foreground">
            关于建站软件的搜索语法请参考 FOFA 组件列表。标注"个人版+/专业版+/商业版+"的功能需对应等级账号。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
