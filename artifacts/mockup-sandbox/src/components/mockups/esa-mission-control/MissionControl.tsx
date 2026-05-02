import React from 'react';
import { Star, Send, Sparkles, User, Crosshair, Map as MapIcon, Mic, Navigation } from 'lucide-react';

export function MissionControl() {
  return (
    <div
      style={{ fontFamily: "'Inter', 'Space Grotesk', sans-serif" }}
      className="min-h-screen bg-[#06090f] text-white overflow-hidden flex flex-col relative"
    >
      {/* Scanline CRT overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-50 opacity-5"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)"
        }}
      />

      {/* Global Custom Styles for Animations */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .animate-pulse-ring::before {
          content: '';
          position: absolute;
          left: -4px;
          top: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 50%;
          border: 2px solid #009fda;
          animation: pulse-ring 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
        }
        .animate-blink {
          animation: blink 2s infinite ease-in-out;
        }
        .panel-shadow {
          box-shadow: 0 0 20px rgba(0,159,218,0.12);
        }
      `}</style>

      {/* HEADER BAR */}
      <header className="h-[60px] flex-none border-b border-[#1a2540] bg-[#0b1120] flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <Star className="text-[#009fda] w-6 h-6 fill-current" />
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-bold tracking-widest text-white">ESA MISSION CONTROL</h1>
            <span className="text-[#94a3b8] text-sm tracking-widest">EXPEDITION 75 · CREW-12</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-[#10b981] font-mono text-sm font-bold tracking-wider animate-blink">
          COMMS STATUS: CONNECTED <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
        </div>

        <div className="flex items-center gap-6 font-mono text-sm">
          <span className="text-white">14:32:07 UTC</span>
          <span className="text-[#f59e0b]">AOS IN 00:12:34</span>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto p-4 grid grid-cols-12 gap-4 relative z-10 h-[calc(100vh-60px)]">
        
        {/* LEFT COLUMN (3 cols) */}
        <div className="col-span-3 flex flex-col gap-4">
          
          {/* CREW STATUS */}
          <div className="bg-[#0b1120] border border-[#1a2540] rounded-lg p-4 flex flex-col panel-shadow">
            <h2 className="text-[#94a3b8] text-xs font-bold tracking-widest mb-4">CREW STATUS</h2>
            <div className="flex flex-col gap-3">
              {/* Jessica Meir */}
              <div className="flex items-center justify-between p-2 rounded bg-[#06090f] border border-[#f59e0b] bg-opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Jessica Meir</span>
                    <span className="text-[10px] text-[#f59e0b] font-mono">CDR</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded">NOMINAL</span>
              </div>
              
              {/* Jack Hathaway */}
              <div className="flex items-center justify-between p-2 rounded bg-[#06090f] border border-[#1a2540]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                  <div className="flex flex-col">
                    <span className="text-sm text-[#94a3b8]">Jack Hathaway</span>
                    <span className="text-[10px] text-[#94a3b8] font-mono">PLT</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded">NOMINAL</span>
              </div>

              {/* Sophie Adenot */}
              <div className="flex items-center justify-between p-2 rounded bg-[#06090f] border border-[#1a2540]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                  <div className="flex flex-col">
                    <span className="text-sm text-[#94a3b8]">Sophie Adenot</span>
                    <span className="text-[10px] text-[#009fda] font-mono">MS1 · ESA</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded">NOMINAL</span>
              </div>

              {/* Andrey Fedyaev */}
              <div className="flex items-center justify-between p-2 rounded bg-[#06090f] border border-[#1a2540]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
                  <div className="flex flex-col">
                    <span className="text-sm text-[#94a3b8]">Andrey Fedyaev</span>
                    <span className="text-[10px] text-[#94a3b8] font-mono">MS2</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded">NOMINAL</span>
              </div>
            </div>
          </div>

          {/* MISSION TIMELINE */}
          <div className="bg-[#0b1120] border border-[#1a2540] rounded-lg p-4 flex flex-col flex-1 panel-shadow">
            <h2 className="text-[#94a3b8] text-xs font-bold tracking-widest mb-4">MISSION TIMELINE</h2>
            <div className="flex flex-col gap-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#94a3b8]">T+02:14</span>
                  <span className="text-white">EVA PREP</span>
                </div>
                <span className="text-[#94a3b8]">SCHEDULED</span>
              </div>
              <div className="flex items-center justify-between border-l-2 border-[#f59e0b] pl-2 -ml-[2px]">
                <div className="flex items-center gap-2">
                  <span className="text-[#f59e0b]">T+00:47</span>
                  <span className="text-white">ISU PASS</span>
                </div>
                <span className="text-[#f59e0b]">UPCOMING</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#94a3b8]">T+03:30</span>
                  <span className="text-white">CREW REPORT</span>
                </div>
                <span className="text-[#94a3b8]">SCHEDULED</span>
              </div>
              <div className="flex items-center justify-between border-l-2 border-[#009fda] pl-2 -ml-[2px]">
                <div className="flex items-center gap-2">
                  <span className="text-[#009fda]">T+00:12</span>
                  <span className="text-white">ORBIT 5820</span>
                </div>
                <span className="text-[#009fda]">NEXT</span>
              </div>
            </div>
          </div>
          
        </div>

        {/* CENTER COLUMN (6 cols) */}
        <div className="col-span-6 flex flex-col gap-4">
          
          {/* ORBITAL TRACKER */}
          <div className="bg-[#0b1120] border border-[#1a2540] rounded-lg relative overflow-hidden h-[280px] panel-shadow flex-none">
            {/* Map Grid SVG */}
            <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#009fda" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              {/* Ground Track */}
              <path d="M 0 140 Q 200 40, 400 140 T 800 140" fill="none" stroke="#009fda" strokeWidth="2" strokeDasharray="4 4" className="opacity-50" />
            </svg>

            {/* Labels HUD */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#009fda]" />
              <span className="font-mono text-xs text-[#009fda] tracking-widest">ORBITAL TRACKER · 4Hz</span>
            </div>
            
            <div className="absolute bottom-3 right-3 font-mono text-xs text-white bg-[#06090f]/80 px-2 py-1 rounded border border-[#1a2540]">
              28.4721°N  45.2198°W
            </div>

            {/* ISU Campus Dot */}
            <div className="absolute left-[52%] top-[38%] flex flex-col items-center">
              <div className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full"></div>
              <span className="font-mono text-[9px] text-[#f59e0b] mt-1">STRASBOURG</span>
            </div>

            {/* ISS Position Dot */}
            <div className="absolute left-[40%] top-[45%] flex items-center justify-center">
              <div className="w-3 h-3 bg-[#009fda] rounded-full relative animate-pulse-ring"></div>
            </div>
          </div>

          {/* COMMS TERMINAL */}
          <div className="bg-[#0b1120] border border-[#1a2540] rounded-lg p-4 flex flex-col flex-1 panel-shadow">
            <div className="flex items-center gap-2 border-b border-[#1a2540] pb-3 mb-3">
              <Mic className="w-4 h-4 text-[#10b981]" />
              <h2 className="text-[#94a3b8] text-xs font-bold tracking-widest">COMMS · ISS ↔ ESOC DARMSTADT</h2>
              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-blink ml-auto"></div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs flex flex-col justify-end mb-4">
              <div className="flex gap-3">
                <span className="text-[#94a3b8] shrink-0">[14:28:15]</span>
                <span className="text-[#009fda] font-bold shrink-0">ESOC:</span>
                <span className="text-white">"Commander Meir, please confirm EVA suit pressure check."</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[#94a3b8] shrink-0">[14:28:42]</span>
                <span className="text-[#f59e0b] font-bold shrink-0">ISS CDR:</span>
                <span className="text-[#e2e8f0]">"ESOC, confirming nominal pressure on both suits. Go for EVA."</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[#94a3b8] shrink-0">[14:29:10]</span>
                <span className="text-[#009fda] font-bold shrink-0">ESOC:</span>
                <span className="text-white">"Copy that. EVA timeline: T-02:14:00. Airlock depressurization on your mark."</span>
              </div>
              <div className="flex gap-3">
                <span className="text-[#94a3b8] shrink-0">[14:29:35]</span>
                <span className="text-[#f59e0b] font-bold shrink-0">ISS CDR:</span>
                <span className="text-[#e2e8f0]">"Understood. Beginning pre-EVA systems checklist now."</span>
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <input 
                type="text" 
                placeholder="Send transmission to ISS…" 
                className="flex-1 bg-[#06090f] border border-[#1a2540] rounded px-3 py-2 text-sm font-mono text-white placeholder:text-[#1a2540] focus:outline-none focus:border-[#009fda]"
              />
              <button className="bg-[#009fda]/20 hover:bg-[#009fda]/30 text-[#009fda] border border-[#009fda]/50 px-4 py-2 rounded text-xs font-bold tracking-widest flex items-center gap-2 transition-colors">
                TRANSMIT <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
          
        </div>

        {/* RIGHT COLUMN (3 cols) */}
        <div className="col-span-3 flex flex-col gap-4">
          
          {/* DIGITAL TWIN / CONTACT */}
          <div className="bg-[#0b1120] border border-[#1a2540] rounded-lg p-4 flex flex-col flex-1 panel-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#009fda]" />
              <div className="flex flex-col">
                <h2 className="text-[#94a3b8] text-xs font-bold tracking-widest">DIGITAL TWIN</h2>
                <span className="text-[10px] text-[#94a3b8]">Commander Jessica Meir · Expedition 75</span>
              </div>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full border-2 border-[#009fda] bg-[#06090f] flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(0,159,218,0.3)]">
                <User className="w-12 h-12 text-[#009fda] opacity-80" />
              </div>
              <div className="text-[10px] font-mono text-[#10b981] flex items-center gap-1.5 bg-[#10b981]/10 px-2 py-1 rounded">
                <span className="animate-blink">●</span> CONNECTED · LOW LATENCY · 412ms
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-4 text-sm">
              <div className="bg-[#06090f] border border-[#1a2540] p-3 rounded-lg rounded-tr-none ml-6">
                <p className="text-white text-xs">Commander Meir, what's the most challenging aspect of your current mission?</p>
              </div>
              
              <div className="bg-[#009fda]/10 border border-[#009fda]/30 p-3 rounded-lg rounded-tl-none mr-6 relative">
                <Sparkles className="w-3 h-3 text-[#009fda] absolute -top-1.5 -left-1.5 bg-[#0b1120] rounded-full" />
                <p className="text-[#e2e8f0] text-xs leading-relaxed">
                  The psychological adaptation remains the greatest challenge — maintaining team cohesion across cultural boundaries while performing highly technical work in a confined environment. The ISU training was invaluable preparation for this...
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
              <textarea 
                placeholder="Ask Commander Meir…" 
                className="w-full bg-[#06090f] border border-[#1a2540] rounded p-3 text-sm text-white placeholder:text-[#1a2540] focus:outline-none focus:border-[#009fda] resize-none h-20"
              />
              <button className="bg-[#009fda] hover:bg-[#009fda]/80 text-white px-4 py-2 rounded text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-colors">
                ASK <Send className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* MISSION VITALS */}
          <div className="bg-[#0b1120] border border-[#1a2540] rounded-lg p-3 panel-shadow flex-none">
            <div className="grid grid-cols-3 gap-2 text-center divide-x divide-[#1a2540]">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#94a3b8] mb-1 font-bold">ALT</span>
                <span className="font-mono text-xs text-[#009fda]">418 km</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#94a3b8] mb-1 font-bold">VEL</span>
                <span className="font-mono text-xs text-[#009fda]">27,580 km/h</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#94a3b8] mb-1 font-bold">ORBIT</span>
                <span className="font-mono text-xs text-[#009fda]">#5819</span>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
