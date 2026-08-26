"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  Maximize,
  Pause,
  Play,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SLIDESHOW_ITEMS } from "@/lib/slideshow/live-feed";
import {
  PACE_OPTIONS,
  setPace,
  stepPace,
  usePace,
} from "@/lib/slideshow/pace";
import { cn } from "@/lib/utils";

/** Idle time before the organizer controls fade away. */
const CONTROLS_IDLE_MS = 3500;
/**
 * Where the organizer lands on exit.
 *
 * The editor, not the admin console: the slideshow is an operator's screen and
 * an operator has no `admin.console` permission, so closing the wall would land
 * on "akses ditolak".
 */
const EXIT_TO = "/editor";

/**
 * Live slideshow: the event's shared photos on the big screen.
 *
 * The organizer projects this and lets it run: shared frames cross-fade one after
 * another, newest first, over a blurred fill so any aspect ratio looks intentional
 * on a wide screen. It plays on its own; the presenter controls — play/pause, step,
 * pace, fullscreen, exit — surface on movement and fade back out so the wall stays
 * clean. Arrow keys step, up/down change the pace, space toggles play. Gated to
 * organizers by the page around it.
 */
export function LiveSlideshow({ eventName }: { eventName: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const items = SLIDESHOW_ITEMS;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [wake, setWake] = useState(0);
  const [idleHidden, setIdleHidden] = useState(false);
  const pace = usePace();

  const current = items[index];

  const next = useCallback(
    () => setIndex((i) => (i + 1) % items.length),
    [items.length],
  );
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + items.length) % items.length),
    [items.length],
  );

  // Auto-advance while playing. setState in the interval callback is the allowed
  // timer pattern, not a synchronous setState in the effect body.
  useEffect(() => {
    if (!playing || items.length < 2) return;
    const id = setInterval(next, pace * 1000);
    return () => clearInterval(id);
  }, [playing, next, items.length, pace]);

  // Fade the controls out after a spell of no activity; any wake resets it.
  const nudge = useCallback(() => {
    setIdleHidden(false);
    setWake((n) => n + 1);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setIdleHidden(true), CONTROLS_IDLE_MS);
    return () => clearTimeout(id);
  }, [wake]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code === "ArrowRight") next();
      else if (event.code === "ArrowLeft") prev();
      // Up is faster, which means a *shorter* hold — the arrow follows the wall,
      // not the number.
      else if (event.code === "ArrowUp") setPace(stepPace(pace, -1));
      else if (event.code === "ArrowDown") setPace(stepPace(pace, 1));
      else if (event.code === "Space") {
        event.preventDefault();
        setPlaying((p) => !p);
      } else return;
      nudge();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, nudge, pace]);

  function goFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // Controls stay put whenever paused, so a stopped wall is still operable.
  const showControls = !idleHidden || !playing;
  const fade = reduceMotion ? 0 : 0.8;

  return (
    <main
      onMouseMove={nudge}
      className={cn(
        "relative flex h-dvh w-full items-center justify-center overflow-hidden bg-black",
        showControls ? "cursor-default" : "cursor-none",
      )}
    >
      {/* Blurred cover fills the letterbox so any ratio reads as deliberate. */}
      <AnimatePresence>
        <motion.div
          key={`bg-${current.id}-${index}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fade }}
          className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
          style={{ backgroundImage: `url(${current.src})` }}
          aria-hidden="true"
        />
      </AnimatePresence>

      <AnimatePresence>
        <motion.img
          key={`${current.id}-${index}`}
          src={current.src}
          alt={`Foto dari ${current.guest}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fade }}
          className="absolute inset-0 m-auto max-h-full max-w-full object-contain drop-shadow-2xl"
        />
      </AnimatePresence>

      {/* The hold made visible. Without it the pace buttons are four numbers the
          operator has to time with a wristwatch to tell apart; with it, one
          glance at the bar says how long the wall sits on a face. Keyed by the
          slide so it restarts, and paused with the show. */}
      <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-white/10">
        <div
          key={`${current.id}-${index}-${pace}`}
          className="bg-white/70 h-full origin-left slideshow-progress"
          style={{
            animationDuration: `${pace}s`,
            animationPlayState: playing ? "running" : "paused",
          }}
          aria-hidden="true"
        />
      </div>

      {/* Top: live badge + event, always legible over the photo. */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent px-6 py-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1 text-xs font-semibold text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
            LIVE
          </span>
          <span className="text-sm font-medium text-white/90">
            {eventName}
          </span>
        </div>

        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={goFullscreen}
            aria-label="Layar penuh"
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Maximize />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.replace(EXIT_TO)}
            aria-label="Keluar slideshow"
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X />
          </Button>
        </div>
      </div>

      {/* Bottom: caption + transport. */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/60 to-transparent px-6 py-5 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">
            {current.guest}
          </p>
          <p className="text-sm text-white/60">{current.at}</p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Spelled out rather than hidden behind a menu: on a projected wall
              the operator is standing up, often in the dark, and "make it
              slower" should be one tap and no reading. */}
          <div
            role="group"
            aria-label="Kecepatan"
            className="mr-1 flex items-center gap-0.5 rounded-full bg-white/10 p-0.5"
          >
            <Gauge className="mx-1.5 size-3.5 text-white/50" aria-hidden="true" />
            {PACE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setPace(option);
                  nudge();
                }}
                aria-pressed={option === pace}
                aria-label={`${option} detik per foto`}
                className={cn(
                  "focus-visible:ring-ring/50 rounded-full px-2.5 py-1 text-xs tabular-nums outline-none transition-colors focus-visible:ring-2",
                  option === pace
                    ? "bg-white text-black"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {option}s
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              prev();
              nudge();
            }}
            aria-label="Sebelumnya"
            className="text-white/80 hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setPlaying((p) => !p);
              nudge();
            }}
            aria-label={playing ? "Jeda" : "Putar"}
            className="text-white/80 hover:bg-white/10 hover:text-white"
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              next();
              nudge();
            }}
            aria-label="Berikutnya"
            className="text-white/80 hover:bg-white/10 hover:text-white"
          >
            <ChevronRight />
          </Button>
          <span className="ml-2 text-sm text-white/60 tabular-nums">
            {index + 1} / {items.length}
          </span>
        </div>
      </div>
    </main>
  );
}
