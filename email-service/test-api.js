fetch('http://localhost:3001/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paperContext: "test",
    chatHistory: [],
    userMessage: "hi"
  })
}).then(async r => {
  console.log("STATUS:", r.status);
  const text = await r.text();
  console.log("BODY:", text.substring(0, 100));
}).catch(console.error);
