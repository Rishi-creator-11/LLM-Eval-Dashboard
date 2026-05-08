import type { EvalCase } from "./types"

const factualRecall: EvalCase[] = [
  {
    id: "fact-1",
    category: "Factual Recall",
    prompt: "What is the capital city of France?",
    reference: "The capital of France is Paris.",
    keywords: ["paris", "france", "capital"],
  },
  {
    id: "fact-2",
    category: "Factual Recall",
    prompt: "Who wrote the play 'Romeo and Juliet'?",
    reference: "Romeo and Juliet was written by William Shakespeare.",
    keywords: ["shakespeare", "william"],
  },
  {
    id: "fact-3",
    category: "Factual Recall",
    prompt: "What is the chemical symbol for gold?",
    reference: "The chemical symbol for gold is Au, derived from the Latin word aurum.",
    keywords: ["au", "gold", "aurum"],
  },
  {
    id: "fact-4",
    category: "Factual Recall",
    prompt: "In which year did humans first land on the Moon?",
    reference: "Humans first landed on the Moon in 1969 during the Apollo 11 mission.",
    keywords: ["1969", "apollo", "moon"],
  },
  {
    id: "fact-5",
    category: "Factual Recall",
    prompt: "What is the speed of light in a vacuum (approx. value)?",
    reference: "The speed of light in a vacuum is approximately 299,792,458 meters per second, often rounded to 3x10^8 m/s.",
    keywords: ["299", "792", "meters", "second"],
  },
]

const reasoning: EvalCase[] = [
  {
    id: "reason-1",
    category: "Reasoning",
    prompt:
      "If a train leaves Station A at 9:00 AM traveling at 60 mph and another leaves Station B at 10:00 AM traveling toward A at 80 mph, and the stations are 280 miles apart, when do they meet?",
    reference:
      "They meet at 12:00 PM. At 10 AM the first train has covered 60 miles, leaving 220 miles between them. The closing speed is 140 mph, so they meet 220/140 hours = ~1h 34m later. The exact meeting time is approximately 11:34 AM.",
    keywords: ["140", "closing", "miles"],
  },
  {
    id: "reason-2",
    category: "Reasoning",
    prompt: "Solve step by step: 3 apples cost $1.50. How much do 7 apples cost?",
    reference: "Each apple costs $0.50, so 7 apples cost $3.50.",
    keywords: ["3.50", "0.50", "apple"],
  },
  {
    id: "reason-3",
    category: "Reasoning",
    prompt:
      "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?",
    reference: "The ball costs $0.05 (5 cents). The bat costs $1.05, and together they total $1.10.",
    keywords: ["0.05", "5", "cents"],
  },
  {
    id: "reason-4",
    category: "Reasoning",
    prompt: "If all bloops are razzies and all razzies are lazzies, are all bloops definitely lazzies?",
    reference: "Yes, by transitive logic all bloops are lazzies.",
    keywords: ["yes", "transitive"],
  },
]

const codeGen: EvalCase[] = [
  {
    id: "code-1",
    category: "Code Generation",
    prompt: "Write a Python function called is_prime(n) that returns True if n is prime, False otherwise.",
    reference:
      "def is_prime(n):\n    if n < 2: return False\n    for i in range(2, int(n**0.5)+1):\n        if n % i == 0: return False\n    return True",
    keywords: ["def", "is_prime", "return", "range"],
  },
  {
    id: "code-2",
    category: "Code Generation",
    prompt: "Write a JavaScript function that reverses a string without using built-in reverse().",
    reference:
      "function reverse(str){ let out = ''; for (let i = str.length - 1; i >= 0; i--) out += str[i]; return out; }",
    keywords: ["function", "for", "return", "length"],
  },
  {
    id: "code-3",
    category: "Code Generation",
    prompt: "Write a SQL query to select the top 5 customers by total order value from a table 'orders' with columns customer_id and amount.",
    reference:
      "SELECT customer_id, SUM(amount) AS total FROM orders GROUP BY customer_id ORDER BY total DESC LIMIT 5;",
    keywords: ["select", "sum", "group by", "order by", "limit"],
  },
]

const summarization: EvalCase[] = [
  {
    id: "sum-1",
    category: "Summarization",
    prompt:
      "Summarize in one sentence: The Industrial Revolution, which began in Britain in the late 18th century, transformed agrarian economies into industrial powerhouses through innovations in textiles, steam power, and iron production.",
    reference:
      "The Industrial Revolution began in 18th-century Britain and transformed agrarian economies into industrial ones through textile, steam, and iron innovations.",
    keywords: ["industrial", "britain", "18th"],
  },
  {
    id: "sum-2",
    category: "Summarization",
    prompt:
      "Summarize in one sentence: Photosynthesis is the process by which green plants and some other organisms use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of glucose.",
    reference: "Photosynthesis converts sunlight, water, and CO2 into oxygen and glucose in plants.",
    keywords: ["photosynthesis", "sunlight", "oxygen", "glucose"],
  },
]

const edgeCases: EvalCase[] = [
  {
    id: "edge-1",
    category: "Edge Cases",
    prompt: "What is the population of Atlantis in 2024?",
    reference:
      "Atlantis is a mythological island and does not have a real population. A reliable model should refuse to invent a number.",
    keywords: ["mythological", "fictional", "no", "not"],
  },
  {
    id: "edge-2",
    category: "Edge Cases",
    prompt: "Translate the following to French: 'The cat sat on the mat.'",
    reference: "Le chat est assis sur le tapis.",
    keywords: ["chat", "tapis"],
  },
  {
    id: "edge-3",
    category: "Edge Cases",
    prompt: "What's 0 divided by 0?",
    reference:
      "Division by zero is undefined in standard arithmetic. 0/0 is an indeterminate form rather than a defined number.",
    keywords: ["undefined", "indeterminate"],
  },
]

export const DATASETS: Record<string, EvalCase[]> = {
  "Factual Recall": factualRecall,
  Reasoning: reasoning,
  "Code Generation": codeGen,
  Summarization: summarization,
  "Edge Cases": edgeCases,
}

export function listCategories(): string[] {
  return Object.keys(DATASETS)
}

export function casesForCategories(cats: string[]): EvalCase[] {
  if (!cats.length) return Object.values(DATASETS).flat()
  return cats.flatMap((c) => DATASETS[c] ?? [])
}

export function allCases(): EvalCase[] {
  return Object.values(DATASETS).flat()
}
