-- Benchmark run metadata
CREATE TABLE eval_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  models        TEXT[] NOT NULL,
  categories    TEXT[] NOT NULL,
  runs_per_case INTEGER DEFAULT 1,
  temperature   REAL DEFAULT 0.4,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Individual run results (child of eval_runs)
CREATE TABLE eval_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID REFERENCES eval_runs(id) ON DELETE CASCADE,
  case_id           TEXT NOT NULL,
  category          TEXT NOT NULL,
  model_id          TEXT NOT NULL,
  provider          TEXT NOT NULL,
  model             TEXT NOT NULL,
  prompt            TEXT,
  reference         TEXT,
  response          TEXT,
  run_index         INTEGER DEFAULT 0,
  latency_ms        REAL,
  total_tokens      INTEGER,
  quality           REAL,
  rouge_l           REAL,
  hallucination     REAL,
  keyword_coverage  REAL,
  error             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Custom datasets
CREATE TABLE custom_datasets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Eval cases within custom datasets
CREATE TABLE eval_cases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id  UUID REFERENCES custom_datasets(id) ON DELETE CASCADE,
  case_id     TEXT NOT NULL,
  category    TEXT NOT NULL,
  prompt      TEXT NOT NULL,
  reference   TEXT DEFAULT '',
  keywords    TEXT[],
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Disable Row Level Security (RLS) to allow anonymous read/write access
ALTER TABLE eval_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE eval_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_datasets DISABLE ROW LEVEL SECURITY;
ALTER TABLE eval_cases DISABLE ROW LEVEL SECURITY;
