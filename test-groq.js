const apiKey = process.argv[2];

if (!apiKey) {
  console.error("❌ Please provide your Groq API key as an argument.");
  console.log("Usage: node test-groq.js <YOUR_API_KEY>");
  process.exit(1);
}

const model = 'openai/gpt-oss-120b'; // The stable 70B model identifier

async function testGroq() {
  console.log(`Testing Groq API with model: ${model}...`);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Say hello in 2 words!' }]
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      console.error("❌ API Request Failed:", JSON.stringify(error, null, 2));
    } else {
      const data = await res.json();
      console.log("✅ Success! The model is working correctly.");
      console.log("Response from Groq:", data.choices[0].message.content);
    }
  } catch (err) {
    console.error("❌ Network or Execution Error:", err);
  }
}

testGroq();
