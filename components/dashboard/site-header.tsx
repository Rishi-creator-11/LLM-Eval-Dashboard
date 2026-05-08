"use client"

import { Activity, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Props {
  modelCount: number
  keys: {
    gemini: number
    groq: number
    openai: number
    anthropic: number
  }
}

export function SiteHeader({ modelCount, keys }: Props) {
  const keyTexts = []
  if (keys.gemini > 0) keyTexts.push(`${keys.gemini} Gemini`)
  if (keys.groq > 0) keyTexts.push(`${keys.groq} Groq`)
  if (keys.openai > 0) keyTexts.push(`${keys.openai} OpenAI`)
  if (keys.anthropic > 0) keyTexts.push(`${keys.anthropic} Anthropic`)

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Activity className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <h1 className="font-semibold tracking-tight">LLM Eval Dashboard</h1>
            <p className="text-xs text-muted-foreground">Benchmark quality · latency · hallucination · consistency</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden gap-1.5 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {modelCount} models
          </Badge>
          {keyTexts.length > 0 && (
            <Badge variant="outline" className="hidden font-mono text-[10px] sm:inline-flex">
              {keyTexts.join(" · ")} keys
            </Badge>
          )}
          <Button asChild size="icon" variant="ghost">
            <a href="/settings" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
