const fetch = require('node-fetch');

async function test() {
  const run = {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    name: "Test Run",
    timestamp: Date.now(),
    models: ["test-model"],
    categories: ["test-cat"],
    runsPerCase: 1,
    temperature: 0.5,
    aggregated: [],
    rawRuns: [
      {
        caseId: "1",
        category: "test-cat",
        modelId: "test-model",
        provider: "gemini",
        model: "gemini-flash",
        prompt: "hello",
        reference: "hello",
        response: "hello",
        runIndex: 0,
        latencyMs: 100,
        totalTokens: 10,
        quality: 1,
        rougeL: 1,
        hallucination: 0,
        keywordCoverage: 1,
        error: null
      }
    ]
  };

  try {
    const res = await fetch('http://localhost:3000/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(run)
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
