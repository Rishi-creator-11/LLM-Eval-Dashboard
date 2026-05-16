import { NextResponse } from "next/server"
import { supabase, hasSupabaseConfig } from "@/lib/supabase"
import type { CustomDataset } from "@/lib/storage"

export async function GET() {
  if (!hasSupabaseConfig) return NextResponse.json([])

  try {
    const { data: datasets, error } = await supabase
      .from("custom_datasets")
      .select("*, eval_cases(*)")
      .order("created_at", { ascending: false }) as any

    if (error) throw error

    const result: CustomDataset[] = datasets.map((d: any) => ({
      id: d.id,
      name: d.name,
      description: d.description || "",
      createdAt: new Date(d.created_at).getTime(),
      cases: (d.eval_cases || []).map((c: any) => ({
        id: c.case_id,
        category: c.category,
        prompt: c.prompt,
        reference: c.reference || "",
        keywords: c.keywords || undefined,
      })),
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!hasSupabaseConfig) return NextResponse.json({ success: false })

  try {
    const dataset: CustomDataset = await req.json()

    // Delete existing if updating (since ID is passed in)
    if (dataset.id) {
      const { data: existing } = await supabase.from("custom_datasets").select("id").eq("id", dataset.id).single()
      if (existing) {
        await supabase.from("custom_datasets").delete().eq("id", dataset.id)
      }
    }

    const { data: inserted, error: datasetError } = await supabase
      .from("custom_datasets")
      .insert({
        id: dataset.id || undefined,
        name: dataset.name,
        description: dataset.description,
      } as any)
      .select()
      .single()

    if (datasetError) throw datasetError

    if (dataset.cases && dataset.cases.length > 0) {
      const casesToInsert = dataset.cases.map((c) => ({
        dataset_id: inserted.id,
        case_id: c.id,
        category: c.category,
        prompt: c.prompt,
        reference: c.reference,
        keywords: c.keywords || null,
      }))

      const { error: casesError } = await supabase.from("eval_cases").insert(casesToInsert as any)
      if (casesError) throw casesError
    }

    return NextResponse.json({ success: true, id: inserted.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
