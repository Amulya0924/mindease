import React, { useState, useEffect } from "react";
import { Smile, Heart, ThumbsUp, Calendar, Trash2, PieChart, Activity } from "lucide-react";
import { MOOD_DETAILS, MoodKey } from "../data";
import { MoodEntry } from "../types";

export default function MoodWidget() {
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodKey | "">("");
  const [note, setNote] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("mindease_moods");
    if (saved) {
      try {
        setMoods(JSON.parse(saved));
      } catch (e) {
        console.warn("Could not load stored moods:", e);
      }
    }
  }, []);

  const saveMoods = (updated: MoodEntry[]) => {
    setMoods(updated);
    localStorage.setItem("mindease_moods", JSON.stringify(updated));
  };

  const handleLogMood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMood) return;

    const newEntry: MoodEntry = {
      id: "mood_" + Date.now(),
      mood: selectedMood,
      note: note.trim(),
      timestamp: new Date().toISOString(),
    };

    const updated = [newEntry, ...moods];
    saveMoods(updated);
    setSelectedMood("");
    setNote("");
    setSuccessMsg("Your emotional state has been safely logged.");
    
    setTimeout(() => {
      setSuccessMsg("");
    }, 3000);
  };

  const handleDeleteEntry = (id: string) => {
    const filtered = moods.filter((m) => m.id !== id);
    saveMoods(filtered);
  };

  // Convert mood entry to numeric score for graphing
  const getMoodScore = (mKey: MoodKey): number => {
    switch (mKey) {
	  //case "calm": return 6;
      case "awesome": return 5;
      case "good": return 4;
      case "okay": return 3;
      case "down": return 2;
      case "anxious": return 1;
      default: return 3;
    }
  };

  // Calculate stats
  const getMostFrequentMood = () => {
    if (moods.length === 0) return "No entries yet";
    const counts: Record<string, number> = {};
    moods.forEach((m) => {
      counts[m.mood] = (counts[m.mood] || 0) + 1;
    });
    
    let maxCount = 0;
    let maxMood: MoodKey | "none" = "none";
    
    Object.entries(counts).forEach(([m, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxMood = m as MoodKey;
      }
    });

    if (maxMood === "none") return "Balanced";
    const details = MOOD_DETAILS[maxMood as MoodKey];
    return details ? details.emoji + " " + details.label : "Balanced";
  };

  // Generate SVG graph coordinates
  const renderTrendSVG = () => {
    if (moods.length < 2) return null;
    
    // Max 7 points on graph to keep it highly clean
    const recentPoints = [...moods].slice(0, 7).reverse();
    const width = 360;
    const height = 100;
    const paddingX = 30;
    const paddingY = 15;
    
    const stepX = (width - paddingX * 2) / (recentPoints.length - 1);
    
    // Scores range from 1 to 5. Map to coordinate Y.
    const getCoordinates = () => {
      return recentPoints.map((entry, index) => {
        const x = paddingX + index * stepX;
        const score = getMoodScore(entry.mood);
        // Inverse coordinate: Height is 5. Height 0 is top (score 5), Height 'height-padding' is bottom (score 1)
        const y = paddingY + ((5 - score) * (height - paddingY * 2)) / 4;
        return { x, y, entry };
      });
    };

    const coords = getCoordinates();
    
    // Build SVG polyline points
    const pointsStr = coords.map(c => `${c.x},${c.y}`).join(" ");

    return (
      <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 mt-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
          <Activity className="w-3.5 h-3.5 text-indigo-500" />
          Emotional Flow Trend (Last 7 Logs)
        </h4>
        <div className="relative">
          <svg className="w-full" viewBox={`0 0 ${width} ${height}`}>
            {/* Guide Grid lines */}
            {[1, 3, 5].map((level) => {
              const yGrid = paddingY + ((5 - level) * (height - paddingY * 2)) / 4;
              return (
                <line
                  key={level}
                  x1={paddingX}
                  y1={yGrid}
                  x2={width - paddingX}
                  y2={yGrid}
                  stroke="#E2E8F0"
                  strokeDasharray="3,3"
                  className="stroke-slate-200 dark:stroke-slate-800"
                />
              );
            })}

            {/* Connecting curve gradient glow */}
            <polyline
              fill="none"
              stroke="#818CF8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsStr}
            />

            {/* Coordinate circles with interactive scores */}
            {coords.map((c, i) => (
              <g key={c.entry.id}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="4"
                  fill="#FFFFFF"
                  stroke="#4F46E5"
                  strokeWidth="2.5"
                />
                <text
                  x={c.x}
                  y={c.y - 8}
                  textAnchor="middle"
                  className="text-[10px] select-none font-sans"
                >
                  {MOOD_DETAILS[c.entry.mood].emoji}
                </text>
              </g>
            ))}
          </svg>
          <div className="flex justify-between px-6 text-[9px] font-mono text-slate-400 mt-1">
            <span>Older</span>
            <span>Recent</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
      <h2 className="font-sans font-semibold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
        Daily Mood Log
      </h2>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
        Log and visualize emotional trends over time
      </p>

      {successMsg && (
        <div className="mb-4 text-xs font-medium text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 py-2.5 px-4 rounded-xl border border-emerald-150 transition-all">
          {successMsg}
        </div>
      )}

      {/* Log Form */}
      <form onSubmit={handleLogMood}>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
          How is your mind feeling right now?
        </label>
        
        {/* Mood Selection Row */}
        <div className="grid grid-cols-5 gap-2.5 mb-5">
          {Object.entries(MOOD_DETAILS).map(([key, item]) => {
            const isSelected = selectedMood === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedMood(key as MoodKey)}
                className={`py-3.5 px-2 rounded-2xl flex flex-col items-center justify-center border text-center transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 scale-[1.03]"
                    : "bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-450"
                }`}
              >
                <span className="text-2xl mb-1.5 transition-transform hover:scale-125">{item.emoji}</span>
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Notes input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Context note (Optional description)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. stressful team scrum, post coffee walk, quiet reading..."
            className="w-full border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 text-slate-800 dark:text-slate-150 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={!selectedMood}
          className="w-full py-3 px-5 rounded-2xl font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white disabled:pointer-events-none"
        >
          Check-in State
        </button>
      </form>

      {/* SVG graph */}
      {renderTrendSVG()}

      {/* Stats and historical records block */}
      <div className="mt-6 border-t border-slate-100 dark:border-slate-900 pt-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <PieChart className="w-3.5 h-3.5 text-indigo-500" />
            Reflection Statistics
          </h4>
          <span className="text-[10px] font-medium py-0.5 px-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 font-mono">
            Most frequent: {getMostFrequentMood()}
          </span>
        </div>

        {/* History Scroll area */}
        <div className="max-h-56 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
          {moods.length === 0 ? (
            <p className="text-xs text-center text-slate-400 py-6">
              No daily entries logged yet. Your checks are private and saved in this browser.
            </p>
          ) : (
            moods.map((entry) => {
              const details = MOOD_DETAILS[entry.mood];
              const dateStr = new Date(entry.timestamp).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              });
              const dayStr = new Date(entry.timestamp).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3 border rounded-xl transition-all hover:shadow-xs bg-slate-50 dark:bg-slate-900 border-slate-250 dark:border-slate-800`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl shrink-0">{details?.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-350">
                          {details?.label}
                        </span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-2.5 h-2.5" />
                          {dayStr}, {dateStr}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic leading-snug">
                          {entry.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors shrink-0"
                    title="Delete log"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
