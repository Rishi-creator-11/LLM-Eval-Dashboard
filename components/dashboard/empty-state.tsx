"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Beaker, BarChart3, Gauge, ShieldAlert, Sparkles } from "lucide-react"

const features = [
  {
    icon: Beaker,
    title: "Multi-provider benchmarking",
    desc: "Run prompts in parallel across Gemini and Groq with built-in API key rotation.",
  },
  {
    icon: Gauge,
    title: "Five evaluation metrics",
    desc: "Quality, ROUGE-L, hallucination, consistency, and keyword coverage scored automatically.",
  },
  {
    icon: ShieldAlert,
    title: "Hallucination heatmap",
    desc: "Spot which models drift from reference answers in which categories.",
  },
  {
    icon: BarChart3,
    title: "Interactive charts",
    desc: "Quality vs latency, per-category radar, latency bars, and per-run distribution.",
  },
]

export function EmptyState() {
  return (
    <div className="space-y-6">
      <Card className="border-dashed bg-gradient-to-br from-card to-secondary/30">
        <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">Ready to evaluate</h2>
          <p className="max-w-md text-pretty text-sm text-muted-foreground leading-relaxed">
            Pick the models and datasets on the left, then hit{" "}
            <span className="font-medium text-foreground">Run Benchmark</span> to score quality, latency,
            hallucination, and consistency across providers.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {features.map((f) => {
          const Icon = f.icon
          return (
            <Card key={f.title}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
