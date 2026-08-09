import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Square, Settings, RefreshCw, Info } from "lucide-react";
import { BREATHING_PRESETS } from "../data";
import { BreathingPattern } from "../types";

type BreathPhase = "idle" | "inhale" | "hold1" | "exhale" | "hold2";

export default function BreathingCircle() {
  const [selectedPreset, setSelectedPreset] = useState<BreathingPattern>(BREATHING_PRESETS[0]);
  const [phase, setPhase] = useState<BreathPhase>("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalCycles, setTotalCycles] = useState(0);

  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop breathing loop
  const stopBreathing = () => {
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setPhase("idle");
    setTimeLeft(0);
  };

  // Safe cleanup
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // Run countdown second-by-second ticker
  const startCountdown = (durationInSeconds: number) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setTimeLeft(durationInSeconds);
    countdownTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Core recursive cycle stepper function
  const cycleStep = (currentPhase: BreathPhase) => {
    let nextPhase: BreathPhase = "idle";
    let duration = 0;

    switch (currentPhase) {
      case "idle":
        // Starting cycle
        nextPhase = "inhale";
        duration = selectedPreset.inhale;
        break;
      case "inhale":
        if (selectedPreset.hold1 > 0) {
          nextPhase = "hold1";
          duration = selectedPreset.hold1;
        } else {
          nextPhase = "exhale";
          duration = selectedPreset.exhale;
        }
        break;
      case "hold1":
        nextPhase = "exhale";
        duration = selectedPreset.exhale;
        break;
      case "exhale":
        if (selectedPreset.hold2 > 0) {
          nextPhase = "hold2";
          duration = selectedPreset.hold2;
        } else {
          nextPhase = "inhale";
          duration = selectedPreset.inhale;
          setTotalCycles((c) => c + 1);
        }
        break;
      case "hold2":
        nextPhase = "inhale";
        duration = selectedPreset.inhale;
        setTotalCycles((c) => c + 1);
        break;
    }

    setPhase(nextPhase);
    startCountdown(duration);

    // Schedule next transition
    phaseTimerRef.current = setTimeout(() => {
      cycleStep(nextPhase);
    }, duration * 1000);
  };

  const startBreathing = () => {
    stopBreathing();
    setTotalCycles(0);
    cycleStep("idle");
  };

  // Change instructions label based on cycle
  const getPhaseInstruction = () => {
    switch (phase) {
      case "inhale":
        return "Breathe In Slowly";
      case "hold1":
        return "Hold Your Breath";
      case "exhale":
        return "Exhale Smoothly";
      case "hold2":
        return "Hold and Rest";
      default:
        return "Ready to Begin?";
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case "inhale":
        return "theme-inhale-bg text-emerald-800 border-emerald-300 dark:text-emerald-300";
      case "hold1":
        return "theme-hold-bg text-indigo-800 border-indigo-300 dark:text-indigo-300";
      case "exhale":
        return "theme-exhale-bg text-teal-800 border-teal-300 dark:text-teal-300";
      case "hold2":
        return "theme-hold2-bg text-amber-800 border-amber-300 dark:text-amber-300";
      default:
        return "bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-700 dark:text-slate-300";
    }
  };

  // Calculate dynamic scale target
  const getCircleScale = () => {
    switch (phase) {
      case "inhale":
        return 1.6;
      case "hold1":
        return 1.6;
      case "exhale":
        return 1.05;
      case "hold2":
        return 1.0;
      default:
        return 1.1;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <h2 className="font-sans font-semibold text-slate-800 dark:text-slate-100 text-lg">
            Mindful Breathing Spacer
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Regulate heartbeat & soothe somatic stress loops
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {BREATHING_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                stopBreathing();
                setSelectedPreset(preset);
              }}
              className={`py-1.5 px-3 text-[11px] font-medium rounded-lg transition-all ${
                selectedPreset.name === preset.name
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-250"
              }`}
            >
              {preset.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Preset description */}
      <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl p-4 w-full mb-6 flex gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-300">
            {selectedPreset.name} Preset ({selectedPreset.inhale}-{selectedPreset.hold1}-{selectedPreset.exhale}-{selectedPreset.hold2})
          </p>
          <p className="mt-1">{selectedPreset.description}</p>
        </div>
      </div>

      {/* Breathing Circle Area */}
      <div className="h-64 flex items-center justify-center relative w-full overflow-hidden my-4">
        {/* Animated breathing aura rings */}
        <AnimatePresence>
          {phase !== "idle" && (
            <motion.div
              initial={{ opacity: 0.1, scale: 1 }}
              animate={{
                opacity: [0.15, 0.03, 0.15],
                scale: getCircleScale() * 1.5,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: phase === "inhale" ? selectedPreset.inhale : phase === "exhale" ? selectedPreset.exhale : 4,
                ease: "easeInOut",
                repeat: Infinity,
              }}
              className="absolute w-36 h-36 rounded-full bg-indigo-400/20 blur-xl pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Central visualizer circle */}
        <motion.div
          animate={{
            scale: getCircleScale(),
          }}
          transition={{
            duration: phase === "inhale" ? selectedPreset.inhale : phase === "exhale" ? selectedPreset.exhale : 0.8,
            ease: "easeInOut",
          }}
          className={`w-36 h-36 rounded-full border flex flex-col items-center justify-center shadow-inner relative transition-colors duration-700 ${getPhaseColor()}`}
        >
          {phase === "idle" ? (
            <div className="text-center p-4">
              <span className="text-2xl">🌱</span>
            </div>
          ) : (
            <div className="text-center select-none flex flex-col items-center">
              <span className="text-2xl font-mono font-bold leading-none tracking-tight">
                {timeLeft}
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70 mt-1">
                seconds
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Cycle stats and status text */}
      <div className="text-center mb-6">
        <h4 className="font-sans font-medium text-slate-800 dark:text-slate-200 text-base h-6">
          {getPhaseInstruction()}
        </h4>
        <div className="flex items-center gap-2 justify-center text-xs text-slate-400 dark:text-slate-500 mt-1">
          {phase !== "idle" ? (
            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-full">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Completed Cycles: <span className="font-semibold text-indigo-500">{totalCycles}</span>
            </span>
          ) : (
            <span>Find a comfortable seating posture.</span>
          )}
        </div>
      </div>

      {/* Loop controls */}
      <div className="flex gap-3 justify-center w-full">
        {phase === "idle" ? (
          <button
            onClick={startBreathing}
            className="flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-md shadow-indigo-150 dark:shadow-none w-full sm:w-auto"
          >
            <Play className="w-4 h-4 fill-white" />
            Begin Session
          </button>
        ) : (
          <button
            onClick={stopBreathing}
            className="flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-medium text-sm transition-all w-full sm:w-auto"
          >
            <Square className="w-4 h-4 fill-current" />
            End Session
          </button>
        )}
      </div>
    </div>
  );
}
