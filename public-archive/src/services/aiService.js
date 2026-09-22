// ARCHIVIO Enterprise AI Client Service
// Implements Dual-Engine Streaming:
// 1. Primary: Firebase AI Logic (Client-Side Direct Gemini Streaming via firebase/ai)
// 2. Fallback: Backend SSE Streaming (/api/ai/chat/stream)
// 3. Fallback: Backend Standard Chat (/api/ai/chat)

import app from '../firebase/config';
import { getBackendUrl } from '../utils/backendUrl';

let isAiLogicDisabled = false;

/**
 * Streams AI chat response using dual-engine approach
 * @param {Object} options
 * @param {Object} [options.paper]
 * @param {Array} options.chatHistory
 * @param {string} options.userMessage
 * @param {string} [options.pdfUrl]
 * @param {string} [options.paperContext]
 * @param {Function} options.onChunk - Called with (accumulatedText, newChunk)
 * @returns {Promise<string>} Full final response text
 */
export async function streamAIChat({
  paper,
  chatHistory = [],
  userMessage,
  pdfUrl,
  paperContext,
  onChunk
}) {
  let accumulatedText = '';

  // ----------------------------------------------------
  // ENGINE 1: Firebase AI Logic (Direct Client-Side SDK)
  // ----------------------------------------------------
  if (!isAiLogicDisabled) {
    try {
      const { getAI, getGenerativeModel } = await import('firebase/ai');
      const ai = getAI(app);
      const model = getGenerativeModel(ai, { model: 'gemini-2.5-flash' });

      let systemPrompt = '';
      if (paperContext) {
        systemPrompt = paperContext;
      } else if (paper) {
        systemPrompt = `You are the Archivio AI Research Assistant at Southwestern University PHINMA for the paper titled: "${paper.researchTitle || 'Untitled'}". Authors: ${paper.authorDisplay || 'Unknown'}. Abstract: ${paper.abstract || 'None'}. Default language is English. Only use Bisaya/Tagalog if the user prompts in that language. Provide comprehensive, structured academic analysis.`;
      } else {
        systemPrompt = `You are the Archivio AI Assistant for Southwestern University PHINMA Public Research Archive. Built by the BSIT Capstone team led by Prince Japhet Vender. Default language is English. Help visitors with academic research, archive exploration, and paper inquiries.`;
      }

      const formattedContents = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      formattedContents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      const streamResult = await model.generateContentStream({
        contents: formattedContents,
        systemInstruction: systemPrompt
      });

      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) {
          accumulatedText += text;
          if (typeof onChunk === 'function') {
            onChunk(accumulatedText, text);
          }
        }
      }

      if (accumulatedText.trim()) {
        return accumulatedText;
      }
    } catch (aiErr) {
      console.warn("Client AI Logic notice (switching to Backend SSE Stream):", aiErr.message);
      if (
        aiErr.message?.includes('api-not-enabled') ||
        aiErr.message?.includes('prepayment') ||
        aiErr.message?.includes('429') ||
        aiErr.message?.includes('quota')
      ) {
        isAiLogicDisabled = true;
      }
    }
  }

  // ----------------------------------------------------
  // ENGINE 2: Backend SSE Stream (/api/ai/chat/stream)
  // ----------------------------------------------------
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paper,
        chatHistory,
        userMessage,
        pdfUrl,
        paperContext
      })
    });

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              accumulatedText += parsed.text;
              if (typeof onChunk === 'function') {
                onChunk(accumulatedText, parsed.text);
              }
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (jsonErr) {
            // Ignore parse errors on partial chunks
          }
        }
      }

      if (accumulatedText.trim()) {
        return accumulatedText;
      }
    }
  } catch (sseErr) {
    console.warn("SSE Stream notice (falling back to standard chat):", sseErr.message);
  }

  // ----------------------------------------------------
  // ENGINE 3: Standard Non-Streaming Fallback (/api/ai/chat)
  // ----------------------------------------------------
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      paper,
      chatHistory,
      userMessage,
      pdfUrl,
      paperContext
    })
  });

  const resText = await response.text();
  let data;
  try {
    data = JSON.parse(resText);
  } catch {
    throw new Error("Invalid response format received from AI server.");
  }

  if (data.text) {
    accumulatedText = data.text;
    if (typeof onChunk === 'function') {
      onChunk(accumulatedText, accumulatedText);
    }
    return accumulatedText;
  }

  throw new Error(data.error || "Unable to generate response.");
}
