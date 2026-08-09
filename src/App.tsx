import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Send, 
  Smile, 
  BookOpen, 
  Wind, 
  AlertTriangle, 
  Flame, 
  MessageSquare, 
  User, 
  Clock, 
  ArrowRight, 
  HelpCircle, 
  CheckCircle,
  Brain,
  History,
  Calendar,
  Layers,
  Heart,
  Volume2,
  Settings,
  LogOut,
  Lock
} from "lucide-react";
import { Message, MoodEntry, JournalEntry, CrisisResource } from "./types";
import { CRISIS_RESOURCES, MOOD_DETAILS, MoodKey } from "./data";
import BreathingCircle from "./components/BreathingCircle";
import MoodWidget from "./components/MoodWidget";

export default function App() {
  // Navigation tab states
  const [activeTab, setActiveTab] = useState<"dialogue" | "journal" | "breathwork" | "mood" | "safety" | "settings">("dialogue");
  
  // Theme & Personalization States
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("mindease_theme");
    return (stored === "dark" || stored === "light") ? stored : "light";
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("mindease_username") || "";
  });
  const [geminiKey, setGeminiKey] = useState(() => {
    return localStorage.getItem("mindease_gemini_key") || localStorage.getItem("mindease_custom_api_key") || "";
  });
  const [openaiKey, setOpenaiKey] = useState(() => {
    return localStorage.getItem("mindease_openai_key") || "";
  });
  const [groqKey, setGroqKey] = useState(() => {
    return localStorage.getItem("mindease_groq_key") || "";
  });
  const [aiProvider, setAiProvider] = useState(() => {
    return localStorage.getItem("mindease_ai_provider") || "gemini";
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("mindease_session_active") === "true";
  });
  const [authName, setAuthName] = useState(() => {
    return localStorage.getItem("mindease_username") || "";
  });
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [settingsPassword, setSettingsPassword] = useState("");
  const [settingsStatus, setSettingsStatus] = useState("");

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("mindease_theme", nextTheme);
  };

  const hashPassword = async (password: string) => {
    const encoded = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = authName.trim();
    if (!cleanName || !authPassword.trim()) {
      setAuthError("Enter both username and password to continue.");
      return;
    }

    const storedName = localStorage.getItem("mindease_username");
    const storedPasswordHash = localStorage.getItem("mindease_password_hash");
    const passwordHash = await hashPassword(authPassword);

    if (storedName && storedPasswordHash && (storedName !== cleanName || storedPasswordHash !== passwordHash)) {
      setAuthError("Username or password is incorrect.");
      return;
    }

    localStorage.setItem("mindease_username", cleanName);
    localStorage.setItem("mindease_password_hash", passwordHash);
    localStorage.removeItem("mindease_password");
    localStorage.setItem("mindease_session_active", "true");
    setUserName(cleanName);
    setAuthName(cleanName);
    setAuthPassword("");
    setAuthError("");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("mindease_session_active");
    setIsAuthenticated(false);
    setAuthPassword("");
    setAuthError("");
    setActiveTab("dialogue");
  };

  const handleUpdatePassword = async () => {
    if (!settingsPassword.trim()) {
      setSettingsStatus("Enter a password before updating.");
      return;
    }

    localStorage.setItem("mindease_password_hash", await hashPassword(settingsPassword));
    setSettingsPassword("");
    setSettingsStatus("Password updated for this browser.");
  };

  // Structured Daily Journal Activity States
  const [gratefulInput, setGratefulInput] = useState("");
  const [selfLoveInput, setSelfLoveInput] = useState("");
  const [intentionInput, setIntentionInput] = useState("");
  const [generalReflectionsInput, setGeneralReflectionsInput] = useState("");
  
  // Chat companion state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [journalError, setJournalError] = useState("");

  // Journal writing and list states
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [journalInput, setJournalInput] = useState(""); // backward compatibility state
  const [isAnalyzingJournal, setIsAnalyzingJournal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [selectedJournalForView, setSelectedJournalForView] = useState<JournalEntry | null>(null);

  // App statistics from localStorage logs
  const [weeklyMoodLogs, setWeeklyMoodLogs] = useState<MoodEntry[]>([]);

  // Refs for auto scrolling chat
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Suggested dialogue snippets
  const SUGGESTIONS = [
    "I'm feeling anxious about work",
    "I need a short mindfulness break",
    "How do I handle racing thoughts?",
    "Help me celebrate a tiny success today"
  ];

  // Load state and logs on component mount
  useEffect(() => {
    // 1. Load Chat Logs
    const storedChat = localStorage.getItem("mindease_chat_history");
    if (storedChat) {
      try {
        setMessages(JSON.parse(storedChat));
      } catch (e) {
        console.warn("Could not parse stored chatbot history:", e);
      }
    } else {
      // Setup friendly initial conversation message
      const welcomeMsg: Message = {
        id: "welcome_prompt",
        role: "model",
        content: `Good afternoon and welcome. I am **MindEase**, your personal guide and mindfulness companion. 

I am here to help you unpack tight thoughts, track your daily moods, regulate breathing, or simply check in with your life reflections without pressure.

How are you holding up right now? If you're feeling overwhelmed, click **Breathwork** above to center yourself, or write down whatever is occupying your thoughts.`,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMsg]);
    }

    // 2. Load Journal Logs
    const storedJournals = localStorage.getItem("mindease_journals");
    if (storedJournals) {
      try {
        const parsed = JSON.parse(storedJournals);
        setJournals(parsed);
        if (parsed.length > 0) {
          setSelectedJournalForView(parsed[0]);
        }
      } catch (e) {
        console.warn("Could not parse stored journals:", e);
      }
    }

    // 3. Load Mood Tracker Logs
    const storedMoods = localStorage.getItem("mindease_moods");
    if (storedMoods) {
      try {
        const parsed = JSON.parse(storedMoods);
        setWeeklyMoodLogs(parsed);
      } catch (e) {
        console.warn("Could not parse weekly mood tracker logs:", e);
      }
    }

    // Sync state dynamically if local storage updates
    const handleStorageChange = () => {
      const freshMoods = localStorage.getItem("mindease_moods");
      if (freshMoods) {
        try { setWeeklyMoodLogs(JSON.parse(freshMoods)); } catch (e) {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    // Listen for custom trigger to reload state (from inside components)
    window.addEventListener("mindease_mood_added", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("mindease_mood_added", handleStorageChange);
    };
  }, []);

  // Sync states to local storage
  const saveChatHistory = (history: Message[]) => {
    setMessages(history);
    localStorage.setItem("mindease_chat_history", JSON.stringify(history));
  };

  const saveJournals = (list: JournalEntry[]) => {
    setJournals(list);
    localStorage.setItem("mindease_journals", JSON.stringify(list));
  };

  // Auto-scroll chat area
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatLoading]);

  // Handle message send to chatbot API
  const handleSendChatMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    setChatError("");

    // Only check key if not using the default Gemini (which uses the pre-configured server key)
    if (aiProvider !== "gemini") {
      const activeKey = aiProvider === "openai" ? openaiKey : groqKey;
      if (!activeKey || !activeKey.trim()) {
        const providerLabel = aiProvider === "openai" ? "ai (OpenAI ChatGPT)" : "grog (Groq Llama)";
        setChatError(`An API Key is compulsory to proceed! Please provide your key for ${providerLabel} in the settings sidebar first.`);
        return;
      }
    }

    const userMsg: Message = {
      id: "msg_" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...messages, userMsg];
    saveChatHistory(updatedHistory);
    setChatInput("");
    setIsChatLoading(true);

    try {
      // Pass the last 8 messages as context to keep fast payload and smart flow
      const historyContext = updatedHistory.slice(-8).map(m => ({
        role: m.role,
        content: m.content
      }));

      const activeKey = aiProvider === "openai" ? openaiKey : aiProvider === "groq" ? groqKey : geminiKey;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-custom-api-key": activeKey || "",
          "x-ai-provider": aiProvider || "gemini"
        },
        body: JSON.stringify({
          message: text,
          history: historyContext,
          userName: userName
        })
      });

      if (!res.ok) {
        let errMsg = `Server returned status: ${res.status}`;
        try {
          const errData = await res.json();
          if (errData) {
            const mainErr = errData.error || "";
            const subDetail = errData.details || "";
            if (mainErr || subDetail) {
              errMsg = `${mainErr}${subDetail ? " - " + subDetail : ""}`;
            }
          }
        } catch (e) {
          // Keep default status string if parsing fails
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const modelMsg: Message = {
        id: "msg_" + (Date.now() + 1),
        role: "model",
        content: data.text,
        timestamp: new Date().toISOString()
      };

      saveChatHistory([...updatedHistory, modelMsg]);
    } catch (err: any) {
      console.error("Chat failure:", err);
      setChatError(err.message || "Unable to reach the server. Please check your secrets configurations.");
    } finally {
      setIsChatLoading(false);
    }
  };

  // Analyze journaling entry
  const handleAnalyzeJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setJournalError("");

    // Only check key if not using default Gemini (which uses the pre-configured server key)
    if (aiProvider !== "gemini") {
      const activeKey = aiProvider === "openai" ? openaiKey : groqKey;
      if (!activeKey || !activeKey.trim()) {
        const providerLabel = aiProvider === "openai" ? "ai (OpenAI ChatGPT)" : "grog (Groq Llama)";
        setJournalError(`An API Key is compulsory to proceed! Please provide your key for ${providerLabel} in the settings sidebar on the left.`);
        return;
      }
    }
    
    const g = gratefulInput.trim();
    const s = selfLoveInput.trim();
    const i = intentionInput.trim();
    const r = generalReflectionsInput.trim();

    // Ensure at least some reflective statement is captured
    if (!g && !s && !i && !r) return;

    // Build the consolidated clean entry
    let cleanContent = "";
    if (g) cleanContent += `🌸 Things I am grateful for today:\n${g}\n\n`;
    if (s) cleanContent += `❤️ What I love about myself:\n${s}\n\n`;
    if (i) cleanContent += `🍃 Positive intention / Peace-point:\n${i}\n\n`;
    if (r) cleanContent += `💭 Underlying thoughts & reflections:\n${r}\n\n`;
    cleanContent = cleanContent.trim();

    setIsAnalyzingJournal(true);
    setAnalysisResult(null);

    const tempJournal: JournalEntry = {
      id: "journal_" + Date.now(),
      content: cleanContent,
      timestamp: new Date().toISOString(),
      isAnalyzing: true
    };

    // Prepend to journals list
    const updatedJournals = [tempJournal, ...journals];
    saveJournals(updatedJournals);
    setSelectedJournalForView(tempJournal);
    
    // Clear Structured Inputs
    setGratefulInput("");
    setSelfLoveInput("");
    setIntentionInput("");
    setGeneralReflectionsInput("");

    try {
      const activeKey = aiProvider === "openai" ? openaiKey : aiProvider === "groq" ? groqKey : geminiKey;

      const res = await fetch("/api/analyze-journal", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-custom-api-key": activeKey || "",
          "x-ai-provider": aiProvider || "gemini"
        },
        body: JSON.stringify({ content: cleanContent })
      });

      if (!res.ok) throw new Error("Server could not inspect your journaling reflections.");
      const data = await res.json();

      const evaluated: JournalEntry = {
        ...tempJournal,
        isAnalyzing: false,
        analysis: data.analysis
      };

      const finalJournals = updatedJournals.map(j => j.id === tempJournal.id ? evaluated : j);
      saveJournals(finalJournals);
      setSelectedJournalForView(evaluated);
      setAnalysisResult(data.analysis);
    } catch (err: any) {
      console.error("Journal analysis error:", err);
      const failed: JournalEntry = {
        ...tempJournal,
        isAnalyzing: false,
        analysis: "Analysis offline. (Write your reflections daily. Connect Gemini API Secrets or correct your custom API key to enable expert CBT mindfulness feedback)."
      };
      const finalJournals = updatedJournals.map(j => j.id === tempJournal.id ? failed : j);
      saveJournals(finalJournals);
      setSelectedJournalForView(failed);
    } finally {
      setIsAnalyzingJournal(false);
    }
  };

  // Utility to clear chats
  const handleResetChat = () => {
    if (confirm("Reset chat history? This clears your current dialogue companion stream.")) {
      localStorage.removeItem("mindease_chat_history");
      const welcomeMsg: Message = {
        id: "welcome_prompt",
        role: "model",
        content: "Dialogue has been refreshed. What's on your mind? I'm listening.",
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMsg]);
    }
  };

  // Utility to delete individual journal entries
  const handleDeleteJournal = (journalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this reflection log permanently?")) {
      const filtered = journals.filter(j => j.id !== journalId);
      saveJournals(filtered);
      if (selectedJournalForView?.id === journalId) {
        setSelectedJournalForView(filtered.length > 0 ? filtered[0] : null);
      }
    }
  };

  // Trigger custom preset in Chat or Breathing
  const handleTriggerQuickPath = (presetType: string) => {
    if (presetType === "anxiety") {
      setActiveTab("breathwork");
    } else if (presetType === "sleep") {
      setActiveTab("breathwork");
    } else if (presetType === "work") {
      handleSendChatMessage("I want to discuss techniques for handling work-related stress, distraction, and burn-out.");
      setActiveTab("dialogue");
    }
  };

  // Calculate dynamic weekly mood overview to draw the vertical bars
  // This reads actual logged states and creates a beautiful geometric layout
  const renderWeeklyBalanceBars = () => {
    // Collect moods from the last 7 days
    const recentLogs = [...weeklyMoodLogs].slice(0, 7).reverse();
    // In case user hasn't logged anything, render a pleasing baseline representation
    const defaultHeights = [50, 70, 45, 80, 55, 90, 65];
    const daysArr = ["M", "T", "W", "T", "F", "S", "S"];

    return (
      <div className="space-y-3">
        <div className="flex items-end justify-between h-20 px-2 mt-2 bg-[#F7F5F0] rounded-xl p-3 border border-brand-border/40">
          {daysArr.map((day, idx) => {
            // Find if there's a log for this relative offset index
            const log = recentLogs[idx];
            let barHeight = defaultHeights[idx];
            let isColored = false;

            if (log) {
              isColored = true;
              // Map score to height 10% - 100%
              const mKey = log.mood;
              const scores: Record<string, number> = { awesome: 100, good: 80, okay: 60, down: 40, anxious: 35 };
              barHeight = scores[mKey] || 50;
            }

            return (
              <div key={idx} className="flex flex-col items-center flex-1 group">
                <div 
                  className={`w-2.5 rounded-full transition-all duration-550 relative ${
                    isColored ? "bg-brand-accent shadow-sm" : "bg-[#DCD8CE]"
                  }`}
                  style={{ height: `${barHeight * 0.7 + 10}%` }}
                  title={log ? `${MOOD_DETAILS[log.mood].emoji} ${MOOD_DETAILS[log.mood].label}: ${log.note || 'No description'}` : "Unlogged day"}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#2D3A3A] text-white text-[9px] py-1 px-1.5 rounded whitespace-nowrap z-30 font-sans shadow-lg">
                    {log ? `${MOOD_DETAILS[log.mood].emoji} ${MOOD_DETAILS[log.mood].label}` : "No entry"}
                  </div>
                </div>
                <span className="text-[9px] text-brand-light font-bold mt-1.5 font-mono">{day}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className={`theme-${theme} ${theme === "dark" ? "dark" : ""} min-h-screen bg-brand-bg text-brand-text font-sans flex items-center justify-center p-6 antialiased`}>
        <div className="w-full max-w-md bg-white border border-brand-border rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-brand-accent text-white flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-semibold text-brand-text">MindEase</h1>
              <p className="text-xs text-brand-muted">Sign in to your local wellness space.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-brand-light mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                placeholder="Enter your name"
                className="w-full border border-brand-border rounded-xl px-3 py-3 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-brand-light mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full border border-brand-border rounded-xl px-3 py-3 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent placeholder-slate-400"
              />
            </div>

            {authError && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl py-3 text-sm font-semibold transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`theme-${theme} ${theme === "dark" ? "dark" : ""} min-h-screen bg-brand-bg text-brand-text font-sans flex flex-col md:flex-row overflow-hidden antialiased`}>
      
      {/* LEFT SIDEBAR PANEL: Personalization, theme, and stats */}
      <aside className="w-full md:w-[325px] bg-white border-b md:border-b-0 md:border-r border-brand-border flex flex-col p-5 md:p-6 shrink-0 h-auto md:h-screen overflow-y-auto">
        
        {/* Branding & Theme Controller Area */}
        <div className="mb-6 flex items-center justify-between md:flex-col md:items-stretch gap-4 border-b border-brand-border/40 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center shadow-inner text-white font-serif font-bold italic text-sm">
              {userName ? userName.slice(0, 2).toUpperCase() : "ME"}
            </div>
            <div>
              <h1 className="text-lg font-serif font-semibold tracking-tight text-brand-text">
                MindEase
              </h1>
              <p className="text-[10px] text-brand-muted italic">
                Your space for clarity.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Middle Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto pr-1">
          
          {/* Weekly Mood tracker balance metric */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-brand-light">
                Weekly Balance
              </p>
              <button 
                onClick={() => setActiveTab("mood")} 
                className="text-[10px] text-brand-accent font-semibold hover:underline"
              >
                Log state
              </button>
            </div>
            {renderWeeklyBalanceBars()}
          </div>





        </div>

        {/* User profile capsule at sidebar bottom */}
        <div className="pt-6 border-t border-brand-border text-xs text-brand-light flex items-center gap-3 mt-4 md:mt-0">
          <div className="w-8 h-8 rounded-lg bg-brand-border flex items-center justify-center text-brand-text font-bold text-xs select-none">
            {userName ? userName.slice(0, 2).toUpperCase() : "ME"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-brand-text truncate">{userName || "MindEase User"}</p>
            <p className="text-[10px] text-brand-muted truncate">
              Signed in locally
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-brand-light hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* RIGHT SIDEBAR / MAIN WORKSPACE AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-brand-bg h-screen overflow-hidden">
        
        {/* UPPER NAVIGATION BAR HEADER */}
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-10 border-b border-brand-border bg-white/60 backdrop-blur-md shrink-0 select-none z-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs md:text-sm font-semibold tracking-wider uppercase text-brand-text font-sans">
              Dialogue Guide & Mindfulness
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 md:gap-5 text-xs md:text-sm text-brand-muted font-medium">
            <button 
              onClick={() => setActiveTab("dialogue")}
              className={`pb-1 px-1 transition-all relative ${
                activeTab === "dialogue" 
                  ? "text-brand-text font-semibold border-b-2 border-brand-accent" 
                  : "hover:text-brand-text"
              }`}
            >
              Dialogue
            </button>
            <button 
              onClick={() => setActiveTab("journal")}
              className={`pb-1 px-1 transition-all relative ${
                activeTab === "journal" 
                  ? "text-brand-text font-semibold border-b-2 border-brand-accent" 
                  : "hover:text-brand-text"
              }`}
            >
              Journal
            </button>
            <button 
              onClick={() => setActiveTab("breathwork")}
              className={`pb-1 px-1 transition-all relative ${
                activeTab === "breathwork" 
                  ? "text-brand-text font-semibold border-b-2 border-brand-accent" 
                  : "hover:text-brand-text"
              }`}
            >
              Breathwork
            </button>
            <button 
              onClick={() => setActiveTab("mood")}
              className={`pb-1 px-1 transition-all relative ${
                activeTab === "mood" 
                  ? "text-brand-text font-semibold border-b-2 border-brand-accent" 
                  : "hover:text-brand-text text-brand-muted md:block" // hide on super small
              }`}
            >
              Moods
            </button>
            <button 
              onClick={() => setActiveTab("settings")}
              className={`pb-1 px-1 transition-all relative inline-flex items-center gap-1 ${
                activeTab === "settings" 
                  ? "text-brand-text font-semibold border-b-2 border-brand-accent" 
                  : "hover:text-brand-text"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
            <button 
              onClick={() => setActiveTab("safety")}
              className={`pb-1 px-1 transition-all relative text-rose-700/80 hover:text-rose-600 ${
                activeTab === "safety" 
                  ? "font-semibold border-b-2 border-rose-500" 
                  : ""
              }`}
            >
              Safety
            </button>
          </div>
        </header>

        {/* INTERACTIVE COMPONENT WORK SPACE (TABS SWITCHER) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          
          {/* TAB 1: EMPATHETIC CHATBOT (DIALOGUE) */}
          {activeTab === "dialogue" && (
            <div className="h-full flex flex-col max-w-4xl mx-auto">
              
              {/* Chat logs render panel */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-6 pr-2">
                {messages.map((m) => (
                  <div 
                    key={m.id} 
                    className={`flex gap-3 md:gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {/* Model Avatar */}
                    {m.role === "model" && (
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-[#7DAA92] text-white flex-shrink-0 flex items-center justify-center font-serif italic text-base shadow-sm">
                        M
                      </div>
                    )}

                    <div className="max-w-[78%] md:max-w-xl group">
                      <div className={`p-4 md:p-6 rounded-2xl border transition-all ${
                        m.role === "user" 
                          ? "bg-brand-text text-white border-brand-text shadow-sm rounded-tr-none" 
                          : "bg-white text-brand-text border-brand-border shadow-xs rounded-tl-none leading-relaxed text-sm whitespace-pre-wrap"
                      }`}>
                        {/* Standard rendering for paragraph markdown lines */}
                        <div className="space-y-2 text-xs md:text-sm">
                          {m.content.split("\n\n").map((para, pIdx) => {
                            // Render simple list format beautifully if any
                            if (para.startsWith("- ") || para.startsWith("* ")) {
                              return (
                                <ul key={pIdx} className="list-disc pl-5 space-y-1 my-1">
                                  {para.split("\n").map((li, lIdx) => (
                                    <li key={lIdx} className="leading-relaxed">
                                      {li.replace(/^[\s-*]+/, "")}
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                            return <p key={pIdx} className="leading-relaxed">{para}</p>;
                          })}
                        </div>
                      </div>

                      {/* Msg Details & Status indicators */}
                      <div className={`flex items-center gap-1 text-[9px] text-brand-light mt-1.5 font-mono uppercase tracking-wider ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}>
                        <Clock className="w-2.5 h-2.5" />
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {m.role === "model" && (
                          <span className="ml-1 px-1.5 py-0.5 bg-brand-border/30 rounded text-[8px]">
                            Empathetic Agent
                          </span>
                        )}
                      </div>
                    </div>

                    {/* User Avatar */}
                    {m.role === "user" && (
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-brand-border text-brand-text flex-shrink-0 flex items-center justify-center font-bold text-xs">
                        ME
                      </div>
                    )}
                  </div>
                ))}

                {/* AI response generating loading state indicator */}
                {isChatLoading && (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-brand-accent text-white flex-shrink-0 flex items-center justify-center font-serif italic text-base animate-pulse">
                      M
                    </div>
                    <div className="bg-white border border-brand-border p-5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce delay-100"></span>
                      <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce delay-200"></span>
                      <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce delay-300"></span>
                      <span className="text-xs text-brand-muted font-mono ml-2 italic">MindEase is reflecting...</span>
                    </div>
                  </div>
                )}

                {/* Error handling widget if present */}
                {chatError && (
                  <div className="p-4 bg-rose-50 border border-rose-150 rounded-2xl text-xs text-rose-700/90 leading-relaxed max-w-md">
                    <p className="font-bold flex items-center gap-1.5 text-rose-800 mb-1">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Dialogue Communication Interrupted
                    </p>
                    <p>{chatError}</p>
                    <button 
                      onClick={() => handleSendChatMessage(messages[messages.length - 1]?.content || "")}
                      className="mt-2 text-[10px] text-indigo-600 hover:underline font-semibold font-mono"
                    >
                      Retry previous statement
                    </button>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Bot communication query panels */}
              <div className="mt-auto pt-4 bg-transparent border-t border-brand-border/35">
                
                {/* Interactive suggestions tags */}
                <div className="flex flex-wrap gap-2 mb-3.5 justify-center md:justify-start">
                  {SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChatMessage(s)}
                      disabled={isChatLoading}
                      className="px-3.5 py-1.5 bg-[#E5E2D9]/40 border border-[#E5E2D9] rounded-full text-[10px] md:text-[11px] font-semibold text-brand-muted cursor-pointer hover:bg-white hover:text-brand-text hover:border-brand-accent disabled:opacity-40 transition-all font-sans"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="relative bg-white border border-brand-border rounded-2xl shadow-md p-1.5 flex items-center">
                  <button 
                    onClick={handleResetChat}
                    className="p-3 text-brand-light hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-transform"
                    title="Clear current conversational history"
                  >
                    <History className="w-5 h-5" />
                  </button>
                  
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isChatLoading && handleSendChatMessage(chatInput)}
                    placeholder="Reflect, ask, check in, or write how your body feels..." 
                    disabled={isChatLoading}
                    className="flex-1 bg-white dark:bg-slate-950 border-none outline-none focus:ring-0 px-4 py-2 rounded-xl text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  
                  <button 
                    onClick={() => handleSendChatMessage(chatInput)}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="bg-brand-accent text-white px-5 py-3 rounded-xl font-semibold text-xs tracking-wide shadow-sm hover:bg-brand-accent-hover transition-colors duration-150 flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Send
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <p className="text-[10px] text-center text-brand-light mt-2.5 font-mono">
                  Your expressions remain fully confidential inside this context of the app.
                </p>
              </div>

            </div>
          )}

          {/* TAB 2: JOURNAL & CBT SENSTIMENT ANALYZER */}
          {activeTab === "journal" && (
            <div className="max-w-5xl mx-auto space-y-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left hand long text input form */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white border border-brand-border p-6 md:p-8 rounded-3xl shadow-sm">
                    <h3 className="font-serif font-medium text-lg text-brand-text mb-2">
                      New Mindful Diary Entry
                    </h3>
                    <p className="text-xs text-brand-muted mb-6 leading-relaxed">
                      Complete each stacked daily reflection field below. MindEase will gather your answers to analyze themes, sentiment, and specialized CBT re-framing prompts.
                    </p>

                    <form onSubmit={handleAnalyzeJournal} className="space-y-4">
                      {/* 🌸 Things I'm grateful for */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-brand-text dark:text-slate-200">
                          🌸 Things I am grateful for today:
                        </label>
                        <textarea
                          rows={2}
                          value={gratefulInput}
                          onChange={(e) => setGratefulInput(e.target.value)}
                          placeholder="1. A hot cup of tea.  2. Talking with my family.  3. The sunset."
                          disabled={isAnalyzingJournal}
                          className="w-full border border-brand-border rounded-xl p-3 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:bg-white dark:focus:bg-slate-950 placeholder-slate-400 dark:placeholder-slate-500"
                        />
                      </div>

                      {/* ❤️ What I love about myself */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-brand-text dark:text-slate-200">
                          ❤️ What I love about myself:
                        </label>
                        <textarea
                          rows={2}
                          value={selfLoveInput}
                          onChange={(e) => setSelfLoveInput(e.target.value)}
                          placeholder="My resilience in complex times, my creativity, and my ability to listen..."
                          disabled={isAnalyzingJournal}
                          className="w-full border border-brand-border rounded-xl p-3 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:bg-white dark:focus:bg-slate-950 placeholder-slate-400 dark:placeholder-slate-500"
                        />
                      </div>

                      {/* 🍃 Moment of peace / intentions */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-brand-text dark:text-slate-200">
                          🍃 A moment of peace or positive intention today:
                        </label>
                        <textarea
                          rows={2}
                          value={intentionInput}
                          onChange={(e) => setIntentionInput(e.target.value)}
                          placeholder="To close my eyes for 1 minute when feeling rushed, and to speak gently to myself..."
                          disabled={isAnalyzingJournal}
                          className="w-full border border-brand-border rounded-xl p-3 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:bg-white dark:focus:bg-slate-950 placeholder-slate-400 dark:placeholder-slate-500"
                        />
                      </div>

                      {/* 💭 Other reflections */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-brand-text dark:text-slate-200">
                          💭 Any other physical feelings or daily thoughts:
                        </label>
                        <textarea
                          rows={3}
                          value={generalReflectionsInput}
                          onChange={(e) => setGeneralReflectionsInput(e.target.value)}
                          placeholder="Feeling slightly tired but clear-headed and ready to explore new habits..."
                          disabled={isAnalyzingJournal}
                          className="w-full border border-brand-border rounded-xl p-3 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:bg-white dark:focus:bg-slate-950 placeholder-slate-400 dark:placeholder-slate-500"
                        />
                      </div>

                      {journalError && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                          ⚠️ {journalError}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-brand-light font-mono flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-brand-accent" />
                          Auto-saved locally
                        </span>
                        
                        <button
                          type="submit"
                          disabled={isAnalyzingJournal || (!gratefulInput.trim() && !selfLoveInput.trim() && !intentionInput.trim() && !generalReflectionsInput.trim())}
                          className="bg-brand-text text-white py-3 px-6 rounded-xl font-semibold text-xs tracking-wide hover:bg-black hover:scale-[1.01] transition-all flex items-center gap-1.5 disabled:opacity-40"
                        >
                          {isAnalyzingJournal ? "Evaluating reflections..." : "Analyze & Save Activity"}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  </div>


                </div>

                {/* Right hand historic listing & analyzer response panel */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Selected entry detailed look */}
                  {selectedJournalForView ? (
                    <div className="bg-white border border-brand-border rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center justify-between border-b border-brand-border/65 pb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-brand-accent" />
                          <span className="text-xs font-semibold font-mono text-brand-muted">
                            {new Date(selectedJournalForView.timestamp).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteJournal(selectedJournalForView.id, e)}
                          className="text-[10px] text-rose-600 hover:underline font-mono bg-rose-50 px-2 py-1 rounded"
                        >
                          delete record
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-brand-bg/20 p-4 rounded-xl border border-brand-border/30">
                          <p className="text-xs text-brand-muted uppercase tracking-widest font-bold mb-2 font-mono text-[9px]">Your Writing</p>
                          <p className="text-xs md:text-sm italic text-brand-text leading-relaxed whitespace-pre-wrap">
                            "{selectedJournalForView.content}"
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-brand-muted uppercase tracking-widest font-bold mb-2 font-mono text-[9px] flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-brand-accent" />
                            Empathetic CBT Cognitive Analysis
                          </p>

                          {selectedJournalForView.isAnalyzing ? (
                            <div className="text-center py-6 space-y-2">
                              <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                              <p className="text-xs text-brand-light font-mono">Synthesizing constructive themes...</p>
                            </div>
                          ) : selectedJournalForView.analysis ? (
                            <div className="text-xs text-brand-text leading-relaxed prose-sm space-y-3 prose-p:my-1.5 border-t border-brand-border/30 pt-3">
                              {selectedJournalForView.analysis.split("\n\n").map((chunk, cIdx) => (
                                <p key={cIdx} className="whitespace-pre-wrap">{chunk}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-brand-light italic">
                              This reflection is stored privately. Complete your secrets setup to enable custom mental models feedback here.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/40 border border-brand-border border-dashed rounded-3xl p-10 text-center text-brand-light">
                      <BookOpen className="w-8 h-8 mx-auto text-brand-light opacity-50 mb-3" />
                      <p className="text-xs">No meditations drafted yet today.</p>
                    </div>
                  )}

                  {/* Complete scrollable journals log */}
                  {journals.length > 0 && (
                    <div className="bg-white border border-brand-border rounded-3xl p-6 shadow-sm">
                      <h4 className="text-xs font-bold text-brand-muted uppercase tracking-widest mb-4 font-mono">
                        Reflection Vault ({journals.length})
                      </h4>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {journals.map((j) => {
                          const isActive = selectedJournalForView?.id === j.id;
                          return (
                            <div
                              key={j.id}
                              onClick={() => setSelectedJournalForView(j)}
                              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                                isActive 
                                  ? "bg-brand-bg border-brand-accent" 
                                  : "bg-white hover:bg-brand-bg/50 border-brand-border"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-mono font-medium text-brand-light">
                                  {new Date(j.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {j.analysis && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 py-0.5 px-2 rounded-full border border-emerald-100 font-mono font-bold">
                                    Analyzed
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-brand-text truncate">
                                {j.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* TAB 3: MINDFUL BREATHWORK EXERCISE */}
          {activeTab === "breathwork" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <BreathingCircle />
              
              {/* Grounding physical sensory focus guide */}
              <div className="bg-white border border-brand-border rounded-3xl p-6 md:p-8 shadow-sm">
                <h3 className="font-serif font-medium text-brand-text text-lg mb-3">
                  Why Breathwork Regulates Anxiety
                </h3>
                <div className="text-xs md:text-sm text-brand-muted space-y-4 leading-relaxed">
                  <p>
                    When our nervous system triggers stress loops, heart rates escalate and respiration becomes shallow. By establishing structured breathing metrics (for example, the Navy Seals **Box Breathing** or the sedative **4-7-8 loop**):
                  </p>
                  <ul className="list-disc pl-5 space-y-2 font-sans font-medium text-brand-text">
                    <li>Extended exhalations actively stimulate the **Vagus Nerve** pathway.</li>
                    <li>Lowers blood pressure and balances adrenaline.</li>
                    <li>Halts cognitive rumination cycle by prioritizing mechanical tactile focus.</li>
                  </ul>
                  <p className="italic pt-2">
                    Tip: Activate the **Ocean Calm soundscape** at the bottom of the left menu before starting to match your inhalations with wave rhythm.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MOOD LOG TRACKER GRID */}
          {activeTab === "mood" && (
            <div className="max-w-3xl mx-auto space-y-8">
              <MoodWidget />

              {/* Informational grid panel for mindfulness metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm">
                  <h4 className="font-serif font-medium text-brand-text text-sm mb-2">My Mood Records and Privacy</h4>
                  <p className="text-xs text-brand-muted leading-relaxed">
                    All emotional checkpoints logged in MindEase are stored exclusively within your local browser storage via <strong>localStorage</strong>. They are never exported, shared, or compiled into cloud databases without authorization, remaining entirely yours.
                  </p>
                </div>
                <div className="bg-white border border-[#7DAA92]/30 bg-[#7DAA92]/5 rounded-2xl p-6 shadow-sm border">
                  <h4 className="font-serif font-medium text-brand-accent text-sm mb-2">The Path Forward</h4>
                  <p className="text-xs text-brand-muted leading-relaxed">
                    Notice cycles or trends? If you verify that certain tasks or situations repeatedly lead to down or anxious logs, check in with the dialogue companion or describe it in details in your diary logs. Over time, self-knowledge promotes deep resilience.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === "settings" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif font-medium text-brand-text text-2xl">Settings</h2>
                  <p className="text-xs text-brand-muted mt-1">
                    Manage account access, appearance, and AI engine configuration.
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white border border-brand-border rounded-3xl p-6 shadow-sm space-y-5">
                  <div>
                    <h3 className="font-serif font-medium text-brand-text text-lg">Account</h3>
                    <p className="text-xs text-brand-muted mt-1">
                      These credentials are stored only in this browser.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-brand-light mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => {
                        setUserName(e.target.value);
                        setAuthName(e.target.value);
                        localStorage.setItem("mindease_username", e.target.value);
                      }}
                      placeholder="Your name"
                      className="w-full text-sm font-semibold bg-white dark:bg-slate-950 border border-brand-border px-3 py-3 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-brand-light mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      value={settingsPassword}
                      onChange={(e) => setSettingsPassword(e.target.value)}
                      placeholder="Enter a new local password"
                      className="w-full text-sm bg-white dark:bg-slate-950 border border-brand-border px-3 py-3 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>

                  {settingsStatus && (
                    <div className="text-xs text-brand-muted bg-brand-bg border border-brand-border rounded-xl p-3">
                      {settingsStatus}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleUpdatePassword}
                    className="w-full bg-brand-text hover:bg-black text-white rounded-xl py-3 text-xs font-semibold transition-colors"
                  >
                    Update Password
                  </button>
                </section>

                <section className="bg-white border border-brand-border rounded-3xl p-6 shadow-sm space-y-5">
                  <div>
                    <h3 className="font-serif font-medium text-brand-text text-lg">Appearance</h3>
                    <p className="text-xs text-brand-muted mt-1">
                      Switch between the light and dark MindEase themes.
                    </p>
                  </div>

                  <button
                    onClick={toggleTheme}
                    className="w-full px-4 py-3 rounded-xl border border-brand-border bg-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-mono text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs font-semibold text-brand-text"
                  >
                    {theme === "light" ? "Dark Phase" : "Light Phase"}
                  </button>
                </section>

                <section className="lg:col-span-2 bg-white border border-brand-border rounded-3xl p-6 shadow-sm space-y-5">
                  <div>
                    <h3 className="font-serif font-medium text-brand-text text-lg">AI Engine Settings</h3>
                    <p className="text-xs text-brand-muted mt-1">
                      Choose the provider used by chat and journal analysis.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-brand-light mb-1.5">
                        Active API Option
                      </label>
                      <select
                        value={aiProvider}
                        onChange={(e) => {
                          const nextProvider = e.target.value;
                          setAiProvider(nextProvider);
                          localStorage.setItem("mindease_ai_provider", nextProvider);
                        }}
                        className="w-full text-sm font-semibold bg-white dark:bg-slate-950 border border-brand-border px-3 py-3 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent cursor-pointer"
                      >
                        <option value="gemini" className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-800">Gemini</option>
                        <option value="groq" className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-800">Groq Llama</option>
                        <option value="openai" className="text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-800">OpenAI ChatGPT</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-brand-light mb-1.5 flex items-center justify-between">
                        <span>
                          {aiProvider === "gemini" && "Gemini key optional"}
                          {aiProvider === "groq" && "Groq key required"}
                          {aiProvider === "openai" && "OpenAI key required"}
                        </span>
                        {aiProvider === "gemini" ? (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">System key enabled</span>
                        ) : ((aiProvider === "groq" && groqKey) || (aiProvider === "openai" && openaiKey)) ? (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Stored</span>
                        ) : (
                          <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">Required</span>
                        )}
                      </label>
                      <input
                        type="password"
                        value={aiProvider === "gemini" ? geminiKey : aiProvider === "groq" ? groqKey : openaiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (aiProvider === "gemini") {
                            setGeminiKey(val);
                            localStorage.setItem("mindease_gemini_key", val);
                          } else if (aiProvider === "groq") {
                            setGroqKey(val);
                            localStorage.setItem("mindease_groq_key", val);
                          } else if (aiProvider === "openai") {
                            setOpenaiKey(val);
                            localStorage.setItem("mindease_openai_key", val);
                          }
                        }}
                        placeholder={
                          aiProvider === "gemini" 
                            ? "Override system Gemini key if needed" 
                            : aiProvider === "groq"
                              ? "gsk_..." 
                              : "sk-..."
                        }
                        className={`w-full text-sm font-mono bg-white dark:bg-slate-950 border px-3 py-3 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent placeholder-slate-400 dark:placeholder-slate-500 transition-all ${
                          aiProvider !== "gemini" && 
                          ((aiProvider === "groq" && !groqKey) || (aiProvider === "openai" && !openaiKey))
                            ? "border-rose-300 dark:border-rose-900 focus:ring-rose-400 focus:border-rose-400"
                            : "border-brand-border"
                        }`}
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* TAB 5: CRISIS RESOURCE DIRECTORY */}
          {activeTab === "safety" && (
            <div className="max-w-3xl mx-auto space-y-8">
              
              <div className="bg-rose-50/50 border border-rose-200 p-6 md:p-8 rounded-3xl text-xs md:text-sm">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h2 className="font-serif font-medium text-rose-800 text-lg mb-2">
                      Safety and Supportive Warning
                    </h2>
                    <p className="text-rose-700/90 leading-relaxed space-y-3">
                      MindEase is designed as a compassionate, stress-relief companion utilizing CBT and positive alignment exercises. <strong>We do not diagnose medical conditions, prescribe medication, or replace psychiatric crisis services.</strong> 
                    </p>
                    <p className="mt-2 text-rose-700/90 leading-relaxed font-sans font-medium">
                      If you contain thoughts of hopelessness, self-harm, severe sorrow, or deep struggle, please utilize these free, safe, and absolute confidential professional networks immediately below. Human guides are standing by holding space for your presence.
                    </p>
                  </div>
                </div>
              </div>

              {/* Resources listing cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CRISIS_RESOURCES.map((r) => (
                  <div key={r.id} className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-brand-border pb-2">
                        <h4 className="font-serif font-medium text-brand-text text-sm">
                          {r.name}
                        </h4>
                        <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-700 font-mono py-0.5 px-2.5 rounded-full font-bold">
                          Urgent Help
                        </span>
                      </div>
                      <p className="text-xs text-brand-muted leading-relaxed mb-4">
                        {r.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* Phone dial display */}
                      <div className="p-3 bg-brand-bg rounded-xl border border-brand-border flex items-center justify-between font-mono">
                        <span className="text-[10px] text-brand-muted uppercase">Phone / Contact:</span>
                        <span className="text-xs font-bold text-brand-text select-all">{r.phone}</span>
                      </div>

                      {/* Tag capsules */}
                      <div className="flex flex-wrap gap-1.5">
                        {r.tags.map((t, tIdx) => (
                          <span key={tIdx} className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-sans font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grounding Exercise Tooltip as instant grounding practice */}
              <div className="bg-white border border-brand-border p-6 rounded-3xl shadow-sm">
                <h3 className="font-serif font-medium text-brand-text text-base mb-3 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-accent" />
                  Tactile Grounding Practice (5-4-3-2-1 Sensory technique)
                </h3>
                <p className="text-xs text-brand-muted leading-relaxed mb-4">
                  If panic begins to set in, look around you and mentally name:
                </p>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-brand-bg rounded-xl border border-brand-border">
                    <span className="text-lg font-serif">5</span>
                    <p className="text-[9px] text-brand-muted mt-1 uppercase font-bold">Things to See</p>
                  </div>
                  <div className="p-2.5 bg-brand-bg rounded-xl border border-brand-border">
                    <span className="text-lg font-serif">4</span>
                    <p className="text-[9px] text-brand-muted mt-1 uppercase font-bold">Things to Touch</p>
                  </div>
                  <div className="p-2.5 bg-brand-bg rounded-xl border border-brand-border">
                    <span className="text-lg font-serif">3</span>
                    <p className="text-[9px] text-brand-muted mt-1 uppercase font-bold">Things to Hear</p>
                  </div>
                  <div className="p-2.5 bg-brand-bg rounded-xl border border-brand-border">
                    <span className="text-lg font-serif">2</span>
                    <p className="text-[9px] text-brand-muted mt-1 uppercase font-bold">Things to Smell</p>
                  </div>
                  <div className="p-2.5 bg-brand-bg rounded-xl border border-brand-border">
                    <span className="text-lg font-serif">1</span>
                    <p className="text-[9px] text-brand-muted mt-1 uppercase font-bold">Thing to Taste</p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
      
    </div>
  );
}
