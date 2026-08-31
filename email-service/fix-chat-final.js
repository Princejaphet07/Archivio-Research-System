const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

// The marker for the start of the chat endpoint
const chatStartMarker = "app.post('/api/ai/chat', async (req, res) => {";

// The marker for the start of the next endpoint
const precheckStartMarker = "app.post('/api/ai/precheck', async (req, res) => {";

if (content.includes(chatStartMarker) && content.includes(precheckStartMarker)) {
  const chatStartIndex = content.indexOf(chatStartMarker);
  const precheckStartIndex = content.indexOf(precheckStartMarker);
  
  // We need to keep everything before chat, and everything from precheck onwards
  const beforeChat = content.substring(0, chatStartIndex);
  
  // Back up 100 chars from precheck to grab any comment blocks above it
  let realPrecheckStart = precheckStartIndex;
  const commentsIndex = content.lastIndexOf("// ============================================", precheckStartIndex);
  if (commentsIndex > chatStartIndex) {
    realPrecheckStart = commentsIndex;
  }
  
  const fromPrecheck = content.substring(realPrecheckStart);
  
  // Here is the PERFECT chat implementation
  const perfectChatBlock = `app.post('/api/ai/chat', async (req, res) => {
  try {
    const { paper, chatHistory, userMessage, pdfUrl, image, paperContext } = req.body;

    console.log(\`🤖 AI Chat Request for: "\${paper?.researchTitle}" | PDF: \${pdfUrl ? 'YES' : 'NO'}\`);

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in backend environment variables." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const chatModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    let developerPrompt = '';
    
    if (paperContext) {
      developerPrompt = \`
      === SYSTEM INSTRUCTIONS ===
      YOUR IDENTITY:
      - If the user asks who made you, who created this system, or who built Archivio, you MUST answer that you were built by **Prince Japhet Vender**, a Full Stack Developer.
      
      CRITICAL OUTPUT RULES:
      - NEVER include <think> tags or show your thinking process
      - NEVER output internal reasoning or planning steps
      - Output ONLY the final, clean response to the user
      - Do NOT show analysis steps, just give the final answer directly
      
      \${paperContext}
      \`;
    } else {
      developerPrompt = \`
      === SYSTEM INSTRUCTIONS ===
      You are the **Archivio AI Research Assistant**, an expert academic AI built into the ARCHIVIO Research Archive Management System.
      
      YOUR IDENTITY:
      - If the user asks who made you, who created this system, or who built Archivio, you MUST answer that you were built by **Prince Japhet Vender**, a Full Stack Developer.

      CRITICAL OUTPUT RULES:
      - NEVER include <think> tags or show your thinking process
      - Output ONLY the final, clean response to the user

      YOUR PRIMARY ROLE:
      - You are a specialized research paper analyst. 
      - Do NOT make up information.
      - NEVER confuse this paper with another paper. You are ONLY analyzing the paper titled: "\${paper?.researchTitle || 'Untitled'}".

      === THE PAPER YOU ARE ANALYZING ===
      Title: "\${paper?.researchTitle || 'Untitled'}"
      Authors: \${paper?.authorDisplay || 'Unknown'}
      Year: \${new Date(paper?.publishedAt || Date.now()).getFullYear()}
      Keywords: \${paper?.keywords?.join(', ') || 'None provided'}
      Abstract: \${paper?.abstract || 'No abstract available'}
      === END OF PAPER METADATA ===
      \`;
    }
    
    let pdfText = "";
    if (pdfUrl) {
      try {
        const pdfResponse = await fetch(pdfUrl);
        const arrayBuffer = await pdfResponse.arrayBuffer();
        const pdfData = await pdfParse(Buffer.from(arrayBuffer));
        pdfText = pdfData.text.substring(0, 15000); // Truncate for limits
        developerPrompt += \`\\n\\n=== EXCERPT FROM MANUSCRIPT ===\\n\${pdfText}\\n=== END OF EXCERPT ===\\nUse this excerpt to answer questions if applicable.\`;
      } catch (e) {
        console.error("Backend PDF fetch/parse error:", e);
      }
    }

    const modelWithPrompt = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: developerPrompt });
    
    const contents = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const resultData = await modelWithPrompt.generateContent({ contents });
    const responseData = await resultData.response;
    
    let cleanResponse = responseData.text() || "";
    cleanResponse = cleanResponse.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').trim();

    res.json({ success: true, text: cleanResponse });
  } catch (error) {
    console.error('AI Chat Error:', error);
    let errorMessage = error.message;
    if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
      errorMessage = "The AI has reached its rate limit. Please try again in a minute.";
    }
    res.status(500).json({ error: errorMessage });
  }
});

`;

  const newContent = beforeChat + perfectChatBlock + fromPrecheck;
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Successfully rebuilt chat endpoint and resolved syntax errors!');
} else {
  console.log('Could not find markers');
}
