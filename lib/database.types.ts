export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      eval_runs: {
        Row: {
          id: string
          name: string
          models: string[]
          categories: string[]
          runs_per_case: number
          temperature: number
          duration_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          models: string[]
          categories: string[]
          runs_per_case?: number
          temperature?: number
          duration_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          models?: string[]
          categories?: string[]
          runs_per_case?: number
          temperature?: number
          duration_ms?: number | null
          created_at?: string
        }
      }
      eval_results: {
        Row: {
          id: string
          run_id: string
          case_id: string
          category: string
          model_id: string
          provider: string
          model: string
          prompt: string | null
          reference: string | null
          response: string | null
          run_index: number
          latency_ms: number | null
          total_tokens: number | null
          quality: number | null
          rouge_l: number | null
          hallucination: number | null
          keyword_coverage: number | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          run_id: string
          case_id: string
          category: string
          model_id: string
          provider: string
          model: string
          prompt?: string | null
          reference?: string | null
          response?: string | null
          run_index?: number
          latency_ms?: number | null
          total_tokens?: number | null
          quality?: number | null
          rouge_l?: number | null
          hallucination?: number | null
          keyword_coverage?: number | null
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          run_id?: string
          case_id?: string
          category?: string
          model_id?: string
          provider?: string
          model?: string
          prompt?: string | null
          reference?: string | null
          response?: string | null
          run_index?: number
          latency_ms?: number | null
          total_tokens?: number | null
          quality?: number | null
          rouge_l?: number | null
          hallucination?: number | null
          keyword_coverage?: number | null
          error?: string | null
          created_at?: string
        }
      }
      custom_datasets: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      eval_cases: {
        Row: {
          id: string
          dataset_id: string
          case_id: string
          category: string
          prompt: string
          reference: string | null
          keywords: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          dataset_id: string
          case_id: string
          category: string
          prompt: string
          reference?: string | null
          keywords?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          dataset_id?: string
          case_id?: string
          category?: string
          prompt?: string
          reference?: string | null
          keywords?: string[] | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
