import { NextResponse } from "next/server"
import { supabase, hasSupabaseConfig } from "@/lib/supabase"
import type { CustomDataset } from "@/lib/storage"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })

  try {
    const resolvedParams = await params;
    const { data: dataset, error } = await supabase
      .from("custom_datasets")
      .select("*, eval_cases(*)")
      .eq("id", resolvedParams.id)
      .single() as any

    if (error) throw error

    const result: CustomDataset = {
      id: dataset.id,
      name: dataset.name,
      description: dataset.description || "",
      createdAt: new Date(dataset.created_at).getTime(),
      cases: (dataset.eval_cases || []).map((c: any) => ({
        id: c.case_id,
        category: c.category,
        prompt: c.prompt,
        reference: c.reference || "",
        keywords: c.keywords || undefined,
      })),
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig) return NextResponse.json({ success: false })

  try {
    const resolvedParams = await params;
    const { error } = await supabase.from("custom_datasets").delete().eq("id", resolvedParams.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
