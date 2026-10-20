import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { BookText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { CHANGELOG } from "./changelog"

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <h2 className="mt-1 text-sm font-semibold text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="text-[13px] leading-6 text-foreground/90">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-1 space-y-1.5 pl-1">{children}</ul>
        ),
        li: ({ children }) => (
          <li className="relative pl-4 text-[13px] leading-6 text-foreground/85 before:absolute before:left-0 before:top-[10px] before:h-1 before:w-1 before:rounded-full before:bg-foreground/40">
            {children}
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        code: ({ children }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">
            {children}
          </code>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-4 border-border" />,
      }}
    >
      {children}
    </ReactMarkdown>
  )
}

export function VersionDialog() {
  const [open, setOpen] = React.useState(false)
  const latest = CHANGELOG[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="版本更新日志"
          title="版本更新日志"
          className="wails-drag-none"
        >
          <BookText />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>更新日志</DialogTitle>
            <Badge variant="secondary" className="text-[10px]">
              最新 {latest.version}
            </Badge>
          </div>
          <DialogDescription>每个版本的功能与改动记录</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-3">
          <div className="space-y-6">
            {CHANGELOG.map((entry) => (
              <section
                key={entry.version}
                className="rounded-lg border border-border bg-muted/30 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {entry.version}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {entry.date}
                  </span>
                </div>
                <Markdown>{entry.markdown}</Markdown>
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
