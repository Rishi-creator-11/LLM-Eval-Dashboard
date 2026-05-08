"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Play, Loader2, Plus, X, Sparkles, Zap } from "lucide-react"
import type { ModelInfo } from "@/lib/llm/types"
import { providerLabel } from "@/lib/format"

export interface RunConfig {
  models: string[]
  categories: string[]
  customPrompts: { prompt: string; reference?: string }[]
  runsPerCase: number
  temperature: number
  maxCasesPerCategory: number
}

interface Props {
  models: ModelInfo[]
  categories: { name: string; count: number }[]
  isRunning: boolean
  onRun: (config: RunConfig) => void
}

export function ControlPanel({ models, categories, isRunning, onRun }: Props) {
  const [selectedModels, setSelectedModels] = useState<string[]>(() =>
    models.length ? [models[0].id, models[2]?.id ?? models[0].id].filter(Boolean) : [],
  )
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    categories.length ? [categories[0].name] : [],
  )
  const [customPrompts, setCustomPrompts] = useState<{ prompt: string; reference: string }[]>([])
  const [runsPerCase, setRunsPerCase] = useState(2)
  const [temperature, setTemperature] = useState(0.4)
  const [maxCasesPerCategory, setMaxCasesPerCategory] = useState(3)

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }
  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]))
  }

  const totalCases = selectedCategories.reduce(
    (sum, name) => sum + Math.min(maxCasesPerCategory, categories.find((c) => c.name === name)?.count ?? 0),
    0,
  )
  const totalCustomCases = customPrompts.filter((p) => p.prompt.trim()).length
  const totalCalls = (totalCases + totalCustomCases) * selectedModels.length * runsPerCase

  const canRun = selectedModels.length > 0 && (totalCases > 0 || totalCustomCases > 0)

  const handleRun = () => {
    onRun({
      models: selectedModels,
      categories: selectedCategories,
      customPrompts: customPrompts.filter((p) => p.prompt.trim()),
      runsPerCase,
      temperature,
      maxCasesPerCategory,
    })
  }

  const geminiModels = models.filter((m) => m.provider === "gemini")
  const groqModels = models.filter((m) => m.provider === "groq")

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Benchmark Configuration
        </CardTitle>
        <CardDescription>Pick models, datasets and run parameters.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Models */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Models</Label>
            <Badge variant="outline" className="text-[10px]">
              {selectedModels.length} selected
            </Badge>
          </div>

          {geminiModels.length > 0 && (
            <ModelGroup
              label="Gemini"
              accentClass="bg-chart-1/10 text-chart-1 border-chart-1/20"
              models={geminiModels}
              selected={selectedModels}
              onToggle={toggleModel}
            />
          )}
          {groqModels.length > 0 && (
            <ModelGroup
              label="Groq"
              accentClass="bg-chart-2/10 text-chart-2 border-chart-2/20"
              models={groqModels}
              selected={selectedModels}
              onToggle={toggleModel}
            />
          )}
        </div>

        <Separator />

        {/* Datasets */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Built-in Datasets</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {categories.map((cat) => (
              <label
                key={cat.name}
                className="flex cursor-pointer items-center justify-between rounded-md border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={selectedCategories.includes(cat.name)}
                    onCheckedChange={() => toggleCategory(cat.name)}
                  />
                  <span>{cat.name}</span>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {cat.count}
                </Badge>
              </label>
            ))}
          </div>
        </div>

        <Separator />

        {/* Custom prompts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Custom Prompts</Label>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-2 text-xs"
              onClick={() => setCustomPrompts((p) => [...p, { prompt: "", reference: "" }])}
            >
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
          {customPrompts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Add your own prompts and (optionally) reference answers for custom evaluation.
            </p>
          ) : (
            <div className="space-y-2">
              {customPrompts.map((cp, i) => (
                <div key={i} className="space-y-1.5 rounded-md border bg-card p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Prompt #{i + 1}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => setCustomPrompts((p) => p.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Prompt..."
                    value={cp.prompt}
                    onChange={(e) =>
                      setCustomPrompts((p) => p.map((it, idx) => (idx === i ? { ...it, prompt: e.target.value } : it)))
                    }
                    rows={2}
                    className="text-xs"
                  />
                  <Textarea
                    placeholder="Reference answer (optional)"
                    value={cp.reference}
                    onChange={(e) =>
                      setCustomPrompts((p) =>
                        p.map((it, idx) => (idx === i ? { ...it, reference: e.target.value } : it)),
                      )
                    }
                    rows={2}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Sliders */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Runs per case</Label>
              <span className="font-mono text-sm font-medium">{runsPerCase}</span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[runsPerCase]}
              onValueChange={(v) => setRunsPerCase(v[0])}
            />
            <p className="text-[11px] text-muted-foreground">Higher = better consistency signal, more API calls.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Temperature</Label>
              <span className="font-mono text-sm font-medium">{temperature.toFixed(2)}</span>
            </div>
            <Slider
              min={0}
              max={1.2}
              step={0.05}
              value={[temperature]}
              onValueChange={(v) => setTemperature(v[0])}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cases per category</Label>
              <span className="font-mono text-sm font-medium">{maxCasesPerCategory}</span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[maxCasesPerCategory]}
              onValueChange={(v) => setMaxCasesPerCategory(v[0])}
            />
          </div>
        </div>

        <Separator />

        {/* Run button */}
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border bg-secondary/40 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              Total API calls
            </div>
            <span className="font-mono text-sm font-semibold">{totalCalls}</span>
          </div>
          <Button onClick={handleRun} disabled={!canRun || isRunning} className="w-full gap-2" size="lg">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Running benchmark...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Run Benchmark
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ModelGroup({
  label,
  accentClass,
  models,
  selected,
  onToggle,
}: {
  label: string
  accentClass: string
  models: ModelInfo[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-[10px] ${accentClass}`}>
          {providerLabel(label.toLowerCase())}
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {models.map((m) => (
          <label
            key={m.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent/50"
          >
            <Checkbox checked={selected.includes(m.id)} onCheckedChange={() => onToggle(m.id)} />
            <span className="flex-1 truncate">{m.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
