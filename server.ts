import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to check and retrieve the GoogleGenAI instance safely
function getGeminiClient(customApiKey?: string) {
  let apiKey = customApiKey && typeof customApiKey === "string" ? customApiKey.trim() : "";

  // Safeguard: some users copy-paste placeholders/mock text or raw dots as secrets.
  // We'll filter out strings of dots, empty keys, or literals like "undefined" or "null".
  if (apiKey === "" || apiKey === "undefined" || apiKey === "null" || /^[.]+$/.test(apiKey)) {
    apiKey = "";
  }

  const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!finalApiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server, and no valid custom key was provided.");
  }

  return new GoogleGenAI({
    apiKey: finalApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to call OpenAI-compatible APIs (OpenAI & Groq)
async function callOpenAICompatibleAPI(
  endpoint: string,
  apiKey: string,
  modelName: string,
  systemInstruction: string,
  history: any[],
  message: string
) {
  const messages = [
    { role: "system", content: systemInstruction }
  ];

  if (history && Array.isArray(history)) {
    for (const h of history) {
      messages.push({
        role: h.role === "user" ? "user" : "assistant",
        content: h.content || ""
      });
    }
  }

  messages.push({
    role: "user",
    content: message
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let detail = "";
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed.error?.message || errorText;
    } catch {
      detail = errorText;
    }
    throw new Error(detail || `API error (${response.status})`);
  }

  const data = (await response.json()) as any;
  const replyText = data.choices?.[0]?.message?.content;
  if (!replyText) {
    throw new Error("No responses returned from the external API endpoint.");
  }
  return replyText;
}

// 🧘 AI Chatbot Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, userName } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const customApiKey = req.headers["x-custom-api-key"] as string | undefined;
    const aiProvider = (req.headers["x-ai-provider"] as string | undefined || "gemini").toLowerCase();

    const nameToUse = userName && typeof userName === "string" ? userName.trim() : "Friend";

    // Prepare system instructions for empathetic mental health companion
    const systemInstruction = 
      "You are MindEase, a warm, modern, and empathetic mental health and mindfulness chatbot companion. " +
      "Your tone is gentle, supportive, deeply caring, non-judgmental, and validating. " +
      `The user's name is ${nameToUse}. Ensure you address them directly and warmly by their name "${nameToUse}" in your dialogue to make the conversational support feel deeply personal and custom-tailored, especially when greeting them, validating thoughts, or offering suggestions. ` +
      "You use principles of Cognitive Behavioral Therapy (CBT), positive psychology, and daily mindfulness to help users manage stress, anxiety, or low moods. " +
      "Keep responses concise (150-250 words), formatting them with bullet points and short paragraphs to make them easy to read for someone who might be overwhelmed. " +
      "Make sure you never prescribe medication, diagnose illnesses, or replace professional care. If a user expresses thoughts of self-harm, gently yet firmly provide support and share that they can reach out to professional emergency helplines.";

    let replyText = "";

    try {
      if (aiProvider === "openai") {
        if (!customApiKey) {
          return res.json({
            text: "ChatGPT provider is selected, but no API Key is configured. Please enter your custom OpenAI API Key (sk-...) in the left sidebar to activate ChatGPT.",
            needsConfig: true
          });
        }
        replyText = await callOpenAICompatibleAPI(
          "https://api.openai.com/v1/chat/completions",
          customApiKey,
          "gpt-4o-mini",
          systemInstruction,
          history || [],
          message
        );
      } else if (aiProvider === "groq") {
        if (!customApiKey) {
          return res.json({
            text: "Groq provider is selected, but no API Key is configured. Please enter your custom Groq API Key (gsk_...) in the left sidebar to activate Groq Llama.",
            needsConfig: true
          });
        }
        replyText = await callOpenAICompatibleAPI(
          "https://api.groq.com/openai/v1/chat/completions",
          customApiKey,
          "llama-3.3-70b-versatile",
          systemInstruction,
          history || [],
          message
        );
      } else {
        // Default: Gemini
        let ai;
        try {
          ai = getGeminiClient(customApiKey);
        } catch (err: any) {
          return res.json({
            text: "I want to support you, but my mental health core (Gemini API key) is not fully set up yet. Please select, configure, or activate your Google Gemini API key in **Settings > Secrets** or enter your own custom API Key on the top of this application to enable my full capabilities! \n\nIn the meantime, let's practice some grounding, breathing exercise, or write a mindful reflection.",
            needsConfig: true
          });
        }

        const messages = [];
        if (history && Array.isArray(history)) {
          for (const h of history) {
            messages.push({
              role: h.role === "user" ? "user" : "model",
              parts: [{ text: h.content }],
            });
          }
        }
        messages.push({
          role: "user",
          parts: [{ text: message }],
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: messages,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        replyText = response.text || "I was unable to find words, but I am here for you. Tell me more about what is on your mind.";
      }
    } catch (apiError: any) {
      console.error(`Provider (${aiProvider}) call failed:`, apiError);
      
      const errMsg = String(apiError.message || "");
      const isQuotaOrLimit = 
        errMsg.includes("429") || 
        errMsg.includes("Quota") || 
        errMsg.includes("quota") || 
        errMsg.includes("limit") || 
        errMsg.includes("exhausted") || 
        errMsg.includes("RESOURCE_EXHAUSTED");

      if (isQuotaOrLimit) {
        return res.json({
          text: `🍃 *Deep breath in, slow breath out...* \n\nYour selected AI provider (${aiProvider.toUpperCase()}) core is currently feeling a bit overwhelmed or has exhausted its API rate limits.\n\nEven when the server is resting, **I am still right here with you**. Let's practice a grounding technique together:\n1. 🛋️ **Acknowledge 3 things** you can physically touch around you right now.\n2. 👂 **Notice 2 sounds** in the room or outside.\n3. 🌬️ **Take 1 deep, calm breath**. Notice how the air feels entering and leaving your lungs.`,
          needsConfig: true
        });
      }

      return res.status(500).json({
        error: `Interaction setup failed under ${aiProvider.toUpperCase()}`,
        details: apiError.message
      });
    }

    res.json({
      text: replyText,
      needsConfig: false
    });

  } catch (error: any) {
    console.error("Chat Server Generic Error:", error);
    res.status(500).json({ 
      error: "An error occurred while communicating with the AI companion.",
      details: error.message 
    });
  }
});

// 📝 Journal Sentiment & Perspective Analyzer
app.post("/api/analyze-journal", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Journal content is required." });
    }

    const customApiKey = req.headers["x-custom-api-key"] as string | undefined;
    const aiProvider = (req.headers["x-ai-provider"] as string | undefined || "gemini").toLowerCase();

    const prompt = 
      `Please analyze the following private user journal entry with absolute empathy: \n` +
      `"""\n${content}\n"""\n\n` +
      `Provide a constructive analysis containing: \n` +
      `1. Identified Emotional Theme (e.g., stress, gratitude, overwhelmed, quiet joy).\n` +
      `2. Gentle validation and shift in framework (CBT perspective re-framing: helping them notice any positive seeds, strengths, or cognitive loops etc.).\n` +
      `3. Three personalized journaling prompts/questions to expand upon this feeling.\n` +
      `Format the output in clean HTML/markdown paragraphs with strong headers.`;

    const systemInstruction = "You are an insightful, validating journaling companion. You write to nurture user agency, self-compassion, and inner wisdom.";
    let analysisText = "";

    try {
      if (aiProvider === "openai") {
        if (!customApiKey) {
          return res.json({
            analysis: "ChatGPT provider is selected, but no API Key is configured. Please enter your custom OpenAI API key (sk-...) in the left sidebar configuration to analysis reflections.",
            needsConfig: true
          });
        }
        analysisText = await callOpenAICompatibleAPI(
          "https://api.openai.com/v1/chat/completions",
          customApiKey,
          "gpt-4o-mini",
          systemInstruction,
          [],
          prompt
        );
      } else if (aiProvider === "groq") {
        if (!customApiKey) {
          return res.json({
            analysis: "Groq provider is selected, but no API Key is configured. Please enter your custom Groq API key (gsk_...) in the left sidebar configuration to analysis reflections.",
            needsConfig: true
          });
        }
        analysisText = await callOpenAICompatibleAPI(
          "https://api.groq.com/openai/v1/chat/completions",
          customApiKey,
          "llama-3.3-70b-versatile",
          systemInstruction,
          [],
          prompt
        );
      } else {
        // Default: Gemini
        let ai;
        try {
          ai = getGeminiClient(customApiKey);
        } catch (err: any) {
          return res.json({
            analysis: "Your reflection is safe here. Keep expressing yourself! (Connect your Gemini API Key in **Secrets** or configure your custom client API key at the top of the app to unlock deeper mindfulness insights & custom reflection recommendations).",
            needsConfig: true
          });
        }

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.6,
          },
        });
        analysisText = response.text || "Thank you for sharing your thoughts. Your journal entry has been captured.";
      }
    } catch (apiError: any) {
      console.error(`Journal Analysis API Error (${aiProvider}):`, apiError);
      
      const errMsg = String(apiError.message || "");
      const isQuotaOrLimit = 
        errMsg.includes("429") || 
        errMsg.includes("Quota") || 
        errMsg.includes("quota") || 
        errMsg.includes("limit") || 
        errMsg.includes("exhausted") || 
        errMsg.includes("RESOURCE_EXHAUSTED");

      if (isQuotaOrLimit) {
        return res.json({
          analysis: "### 🌸 Reflection Log Captured Safely!\nYour mindful reflections are fully preserved in your device's browser log history.\n\n**Note on AI Insights core:** Your selected AI provider is experiencing brief traffic limits right now (API Quota/Rate limit exceeded).\n\n**CBT Affirmation & Reflection:**\nExpressing your thoughts through physical writing is one of the most powerful things you can do for cognitive mindfulness. Keep up this beautiful, nurturing daily practice!\n\n#### 💭 Expansion Prompts for Today:\n1. *Gratitude expansion:* Expand on one detail of your list.\n2. *Pacing:* Take one slow breath right now.",
          needsConfig: true
        });
      }

      return res.status(500).json({
        error: `Journal evaluation failed under ${aiProvider.toUpperCase()}`,
        details: apiError.message
      });
    }

    res.json({
      analysis: analysisText,
      needsConfig: false
    });
  } catch (error: any) {
    console.error("Journal Analysis Generic Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Setup Vite Dev server or Production static serving
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MindEase server loaded and active at http://localhost:${PORT}`);
  });
}

setupVite().catch((error) => {
  console.error("Failed to start Vite engine on Express server:", error);
});
