"use client";

import { useState } from "react";
import KineticGrid from "@/components/ui/kinetic-grid";
import { Sparkles, ArrowRight, ShieldCheck, Zap, Github, Layers } from "lucide-react";

export default function KineticGridHero() {
  const [colorMode, setColorMode] = useState<"default" | "monochrome">("default");

  return (
    <KineticGrid globalColor={colorMode}>
      <div className="flex min-h-screen flex-col items-center justify-between px-6 py-12 text-white">
        {/* Navigation Bar */}
        <header className="w-full max-w-6xl flex items-center justify-between py-4 backdrop-blur-md bg-white/5 border border-white/10 px-6 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight text-lg">KineticCanvas</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setColorMode(m => m === "default" ? "monochrome" : "default")}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border border-white/20 hover:bg-white/10 transition-colors backdrop-blur-sm"
              title="Toggle Color Mode"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Theme: {colorMode === "default" ? "Vibrant Blue" : "Monochrome"}</span>
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors border border-white/15"
            >
              <Github className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </header>

        {/* Hero Body */}
        <main className="flex flex-col items-center justify-center text-center max-w-4xl my-auto px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-300 shadow-inner mb-6 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-blue-400" />
            <span>Interactive Real-time Canvas Mesh</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-400 leading-tight">
            Fluid Physics. <br />
            Interactive Kinetic Grid.
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg text-slate-300/80 leading-relaxed font-normal">
            Move your cursor across the screen to dynamically warp the grid mesh. Click anywhere to propagate physical radial waves across the canvas coordinate system.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-sm shadow-xl shadow-blue-500/25 transition-all transform hover:-translate-y-0.5">
              <span>Explore Showcase</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-medium text-sm backdrop-blur-md transition-all">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Production Ready</span>
            </button>
          </div>

          {/* Social Proof with Unsplash Avatars */}
          <div className="mt-12 flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
            <div className="flex -space-x-2 overflow-hidden">
              <img
                className="inline-block h-7 w-7 rounded-full ring-2 ring-slate-900 object-cover"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Sarah Jenkins"
              />
              <img
                className="inline-block h-7 w-7 rounded-full ring-2 ring-slate-900 object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                alt="David Chen"
              />
              <img
                className="inline-block h-7 w-7 rounded-full ring-2 ring-slate-900 object-cover"
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                alt="Elena Rostova"
              />
            </div>
            <p className="text-xs text-slate-300">
              Trusted by <strong>2,500+</strong> creative developers worldwide
            </p>
          </div>
        </main>

        {/* Footer info */}
        <footer className="text-xs text-white/40 tracking-wider">
          Click anywhere to trigger radial ripple waves &bull; High-FPS hardware accelerated HTML5 Canvas
        </footer>
      </div>
    </KineticGrid>
  );
}
