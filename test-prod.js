const fetch = require('node-fetch');

async function test() {
  const baseUrl = 'https://llm-eval-dashboard-ieffij8aq-nakshatramote-9000s-projects.vercel.app';
  try {
    const res = await fetch(`${baseUrl}/api/runs`);
    console.log("GET Status:", res.status);
    const text = await res.text();
    console.log("GET Response:", text.substring(0, 200));
    
    const resPost = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        name: "Test Run",
        timestamp: Date.now(),
        models: ["test-model"],
        categories: ["test-cat"],
        runsPerCase: 1,
        temperature: 0.5,
        aggregated: [],
        rawRuns: []
      })
    });
    console.log("POST Status:", resPost.status);
    console.log("POST Response:", await resPost.text());

  } catch (e) {
    console.error("Error:", e);
  }
}

test();
