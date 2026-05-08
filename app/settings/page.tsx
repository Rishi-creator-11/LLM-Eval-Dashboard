"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Check, X, Loader2, KeyRound, ArrowLeft, Shield } from "lucide-react"
import { loadApiKeys, saveApiKeys, type StoredApiKeys } from "@/lib/storage"

type ProviderKey = keyof StoredApiKeys

const PROVIDER_CONFIG: { id: ProviderKey; name: string; placeholder: string }[] = [
  { id: "gemini", name: "Gemini", placeholder: "AIzaSy..." },
  { id: "groq", name: "Groq", placeholder: "gsk_..." },
  { id: "openai", name: "OpenAI", placeholder: "sk-..." },
  { id: "anthropic", name: "Anthropic", placeholder: "sk-ant-..." },
]

export default function SettingsPage() {
  const [keys, setKeys] = useState<StoredApiKeys>({ gemini: "", groq: "", openai: "", anthropic: "" })
  const [savedKeys, setSavedKeys] = useState<StoredApiKeys | null>(null)
  const [testing, setTesting] = useState<Partial<Record<ProviderKey, boolean>>>({})
  const [testResults, setTestResults] = useState<Partial<Record<ProviderKey, { ok: boolean; error?: string }>>>({})
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadApiKeys().then((k) => {
      setKeys(k)
      setSavedKeys(k)
      setLoaded(true)
    })
  }, [])

  const handleChange = (provider: ProviderKey, value: string) => {
    setKeys((prev) => ({ ...prev, [provider]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    await saveApiKeys(keys)
    setSavedKeys({ ...keys })
    setSaving(false)
  }

  const testKey = useCallback(async (provider: ProviderKey) => {
    if (!keys[provider].trim()) return
    setTesting((t) => ({ ...t, [provider]: true }))
    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: keys[provider] }),
      })
      const data = await res.json()
      setTestResults((r) => ({ ...r, [provider]: data }))
    } catch (e: any) {
      setTestResults((r) => ({ ...r, [provider]: { ok: false, error: e?.message ?? "Network error" } }))
    } finally {
      setTesting((t) => ({ ...t, [provider]: false }))
    }
  }, [keys])

  const hasChanges =
    !savedKeys ||
    keys.gemini !== savedKeys.gemini ||
    keys.groq !== savedKeys.groq ||
    keys.openai !== savedKeys.openai ||
    keys.anthropic !== savedKeys.anthropic

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <a href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </a>
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>API Key Management</CardTitle>
                <CardDescription>
                  Bring your own keys. They are encrypted with AES-GCM and stored locally in your browser.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {PROVIDER_CONFIG.map((cfg) => (
              <div key={cfg.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`key-${cfg.id}`} className="text-sm font-medium">
                    {cfg.name}
                  </Label>
                  {testResults[cfg.id] && (
                    <Badge variant={testResults[cfg.id]?.ok ? "success" : "destructive"} className="text-[10px]">
                      {testResults[cfg.id]?.ok ? (
                        <Check className="mr-1 h-3 w-3" />
                      ) : (
                        <X className="mr-1 h-3 w-3" />
                      )}
                      {testResults[cfg.id]?.ok ? "Working" : testResults[cfg.id]?.error ?? "Failed"}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    id={`key-${cfg.id}`}
                    type="password"
                    placeholder={cfg.placeholder}
                    value={keys[cfg.id]}
                    onChange={(e) => handleChange(cfg.id, e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testKey(cfg.id)}
                    disabled={testing[cfg.id] || !keys[cfg.id].trim()}
                  >
                    {testing[cfg.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Keys are never sent to our servers except for API calls.</span>
              </div>
              <Button onClick={handleSave} disabled={saving || !hasChanges}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Keys
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>
              LLM Eval Dashboard — A persistent evaluation infrastructure for comparing LLM performance.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>Saved runs, custom datasets, and API keys are stored locally in your browser.</p>
            <p>Encrypted with the Web Crypto API (AES-GCM 256-bit).</p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
