import React, { useState, useEffect, useRef } from "react";
import { 
  useGetIssPosition, 
  useGetIssPasses, 
  useGetIssCrew, 
  useGetIssSummary,
  useListConversations,
  useCreateConversation,
  useGetConversation
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import logoUrl from "@assets/International_Space_University_1777725450504.png";
import { motion } from "framer-motion";

const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="font-mono text-primary text-xl border border-primary/30 px-4 py-2 rounded bg-card/50 shadow-[0_0_15px_rgba(0,229,255,0.1)]">
      {time.toISOString().substring(11, 19)} UTC
    </div>
  );
};

const Header = () => {
  return (
    <header className="flex items-center justify-between p-4 border-b border-primary/20 bg-background/95 backdrop-blur z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <img src={logoUrl} alt="ISU Logo" className="h-12 w-auto" />
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-white">EXPEDITION 75</h1>
          <div className="flex items-center gap-2 text-sm font-mono text-primary">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            MISSION CONTROL LIVE
          </div>
        </div>
      </div>
      <Clock />
    </header>
  );
};

const TelemetryPanel = () => {
  const { data: position } = useGetIssPosition({ query: { refetchInterval: 5000 } });

  return (
    <Card className="p-4 border-primary/30 shadow-[0_0_20px_rgba(0,229,255,0.05)] bg-card flex flex-col gap-4">
      <h2 className="text-lg font-bold text-primary/80 uppercase tracking-widest border-b border-primary/20 pb-2">Live Telemetry</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase">Altitude</span>
          <span className="font-mono text-xl text-white">{position?.altitude ? position.altitude.toFixed(2) : "---.--"} km</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase">Velocity</span>
          <span className="font-mono text-xl text-white">{position?.velocity ? position.velocity.toFixed(2) : "----.--"} km/h</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase">Latitude</span>
          <span className="font-mono text-xl text-white">{position?.latitude ? position.latitude.toFixed(4) : "--.----"}°</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase">Longitude</span>
          <span className="font-mono text-xl text-white">{position?.longitude ? position.longitude.toFixed(4) : "--.----"}°</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between p-2 bg-primary/10 rounded border border-primary/20">
        <span className="text-xs uppercase text-primary">Visibility</span>
        <span className="font-mono text-sm uppercase text-accent">{position?.visibility || "UNKNOWN"}</span>
      </div>
    </Card>
  );
};

const PassCountdown = () => {
  const { data: passesData } = useGetIssPasses({ query: { refetchInterval: 300000 } });
  const nextPass = passesData?.passes?.[0];
  
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!nextPass) return;
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      setCountdown(Math.max(0, nextPass.risetime - now));
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextPass]);

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `T-${h}:${m}:${s}`;
  };

  return (
    <Card className="p-4 border-accent/30 shadow-[0_0_20px_rgba(255,170,0,0.05)] bg-card flex flex-col gap-4">
      <h2 className="text-lg font-bold text-accent/80 uppercase tracking-widest border-b border-accent/20 pb-2">Next ISU Overhead Pass</h2>
      <div className="flex flex-col items-center py-4">
        <span className="text-4xl font-mono text-accent drop-shadow-[0_0_10px_rgba(255,170,0,0.8)]">
          {nextPass ? formatCountdown(countdown) : "T-00:00:00"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm mt-2">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase">Duration</span>
          <span className="font-mono text-white">{nextPass?.duration || 0}s</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase">Max Elevation</span>
          <span className="font-mono text-white">{nextPass?.maxElevation || 0}°</span>
        </div>
      </div>
    </Card>
  );
};

const CommanderPanel = () => {
  const { data: crewData } = useGetIssCrew({ query: { refetchInterval: 60000 } });
  const { data: summary } = useGetIssSummary({ query: { refetchInterval: 10000 } });

  return (
    <Card className="p-4 border-primary/30 bg-card flex flex-col gap-4">
      <h2 className="text-lg font-bold text-primary/80 uppercase tracking-widest border-b border-primary/20 pb-2">Crew Manifest</h2>
      <div className="flex items-center gap-4 p-3 bg-primary/5 border border-primary/20 rounded">
        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl border border-primary">
          JM
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Jessica Meir</h3>
          <p className="text-sm text-primary uppercase font-mono tracking-widest">Commander</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col p-2 bg-black/40 rounded border border-white/5">
          <span className="text-xs text-muted-foreground uppercase">Mission Day</span>
          <span className="font-mono text-white">{summary?.missionDay || "000"}</span>
        </div>
        <div className="flex flex-col p-2 bg-black/40 rounded border border-white/5">
          <span className="text-xs text-muted-foreground uppercase">Orbits</span>
          <span className="font-mono text-white">{summary?.orbitsCompleted || "00000"}</span>
        </div>
      </div>
      <div>
        <h4 className="text-xs text-muted-foreground uppercase mb-2">Total Crew ({crewData?.number || 0})</h4>
        <ScrollArea className="h-24">
          <div className="space-y-1">
            {crewData?.people.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-white">{p.name}</span>
                <span className="text-primary font-mono text-xs">{p.craft}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};

const IssMapMarker = () => {
  const { data: position } = useGetIssPosition({ query: { refetchInterval: 5000 } });
  if (!position) return null;

  const left = `${(position.longitude + 180) * (100 / 360)}%`;
  const top = `${(90 - position.latitude) * (100 / 180)}%`;

  return (
    <>
      <div 
        className="absolute w-3 h-3 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_#00e5ff] transition-all duration-1000 ease-linear"
        style={{ left, top }}
        title="ISS"
      >
        <div className="absolute inset-0 rounded-full animate-ping bg-primary opacity-50"></div>
      </div>
      <div 
        className="absolute text-[10px] text-primary font-mono ml-4 transform -translate-y-1/2 drop-shadow-md transition-all duration-1000 ease-linear"
        style={{ left, top }}
      >ISS</div>
    </>
  );
};

const LiveFeed = () => {
  return (
    <Card className="p-0 border-primary/30 bg-card h-full flex flex-col relative overflow-hidden">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-black/70 px-2 py-1 rounded backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="text-xs font-mono text-white uppercase tracking-widest">NASA TV LIVE</span>
      </div>
      <div className="flex-1 w-full h-full min-h-[280px] relative flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at center, #0a1628 0%, #050c1a 50%, #020810 100%)',
        }}
      >
        {/* Star field effect */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() > 0.8 ? '2px' : '1px',
                height: Math.random() > 0.8 ? '2px' : '1px',
                left: `${(i * 17.3) % 100}%`,
                top: `${(i * 23.7 + 11) % 100}%`,
                opacity: 0.3 + ((i * 0.13) % 0.7),
              }}
            />
          ))}
        </div>
        {/* ISS silhouette */}
        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8">
          <svg width="120" height="60" viewBox="0 0 120 60" fill="none" className="opacity-70">
            <rect x="40" y="27" width="40" height="6" fill="#00e5ff" opacity="0.8"/>
            <rect x="52" y="20" width="16" height="20" fill="#00e5ff" opacity="0.6"/>
            <rect x="0" y="28" width="120" height="4" fill="#00e5ff" opacity="0.4"/>
            <rect x="8" y="22" width="20" height="16" fill="#00e5ff" opacity="0.3" rx="1"/>
            <rect x="92" y="22" width="20" height="16" fill="#00e5ff" opacity="0.3" rx="1"/>
            <circle cx="60" cy="30" r="3" fill="#00e5ff" opacity="0.9"/>
          </svg>
          <div className="space-y-2">
            <p className="text-primary font-mono text-sm uppercase tracking-widest">International Space Station</p>
            <p className="text-white/60 text-xs font-mono">Altitude: 408 km · Orbital Period: 92.68 min</p>
          </div>
          <a
            href="https://www.youtube.com/watch?v=jXNSIpjTYMI"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/40 text-red-400 font-mono text-xs uppercase tracking-widest rounded hover:bg-red-600/30 hover:border-red-400/60 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Watch NASA TV Live
          </a>
        </div>
        <div className="absolute inset-0 border border-primary/10 pointer-events-none"></div>
      </div>
    </Card>
  );
};

const AIMentorSidebar = () => {
  const { data: convos } = useListConversations();
  const createConv = useCreateConversation();
  
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  useEffect(() => {
    if (convos && convos.length > 0 && !selectedId) {
      setSelectedId(convos[0].id);
    }
  }, [convos, selectedId]);

  const { data: convData } = useGetConversation(selectedId as number, { 
    query: { enabled: !!selectedId, queryKey: ['/api/openai/conversations', selectedId] } 
  });

  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startNew = () => {
    createConv.mutate({ data: { title: `Briefing ${new Date().toLocaleTimeString()}` } }, {
      onSuccess: (res) => setSelectedId(res.id)
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedId) return;
    
    const userMsg = input;
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    
    try {
      const response = await fetch(`/api/openai/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg })
      });
      
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.done) break;
              if (json.content) {
                setStreamingContent(prev => prev + json.content);
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            } catch (e) {}
          }
        }
      }
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <Card className="h-full flex flex-col border-primary/30 bg-card overflow-hidden">
      <div className="p-3 border-b border-primary/20 flex items-center justify-between bg-primary/5">
        <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Digital Twin Mentor
        </h2>
        <Button variant="outline" size="sm" onClick={startNew} className="h-7 text-xs border-primary/30 text-primary hover:bg-primary hover:text-black">
          New Briefing
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-4" ref={scrollRef}>
        {convData?.messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-muted-foreground uppercase mb-1">{m.role === 'user' ? 'You' : 'Mentor'}</span>
            <div className={`p-3 rounded max-w-[85%] text-sm ${m.role === 'user' ? 'bg-primary/20 text-white border border-primary/30 rounded-tr-none' : 'bg-black/50 text-primary border border-primary/10 rounded-tl-none font-mono leading-relaxed'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex flex-col items-start">
             <span className="text-[10px] text-muted-foreground uppercase mb-1">Mentor</span>
             <div className="p-3 rounded max-w-[85%] text-sm bg-black/50 text-primary border border-primary/10 rounded-tl-none font-mono leading-relaxed">
               {streamingContent}
               <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse align-middle"></span>
             </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-primary/20 bg-background/50">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Query digital twin..." 
            className="bg-black/50 border-primary/30 focus-visible:ring-primary text-white font-mono text-sm rounded-none"
            disabled={isStreaming}
          />
          <Button type="submit" disabled={isStreaming || !input.trim()} className="bg-primary text-black hover:bg-primary/80 rounded-none font-mono uppercase text-xs font-bold tracking-widest">
            Send
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground font-sans overflow-hidden selection:bg-primary selection:text-black">
      <Header />
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 h-[calc(100vh-81px)]">
        {/* Left Column */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
          <TelemetryPanel />
          <PassCountdown />
          <CommanderPanel />
        </div>
        
        {/* Center Column */}
        <div className="col-span-6 flex flex-col gap-4">
          <div className="h-64 relative rounded border border-primary/30 overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.05)] bg-card">
             <div className="absolute top-2 left-2 z-10">
                <span className="text-xs font-mono text-primary uppercase tracking-widest bg-black/60 px-2 py-1 rounded backdrop-blur">ORBITAL TRACKER</span>
             </div>
             {/* Simple Equirectangular Map Projection */}
             <div className="w-full h-full relative" style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 360 180\' fill=\'none\' stroke=\'%2300e5ff33\' stroke-width=\'0.5\'%3E%3Cpath d=\'M 0 90 L 360 90 M 180 0 L 180 180\'/%3E%3C/svg%3E")',
                backgroundSize: '100% 100%'
             }}>
                {/* ISU Location */}
                <div 
                  className="absolute w-2 h-2 bg-accent rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_#ffaa00]"
                  style={{ left: `${(7.7386 + 180) * (100 / 360)}%`, top: `${(90 - 48.5231) * (100 / 180)}%` }}
                  title="ISU Strasbourg"
                ></div>
                <div 
                  className="absolute text-[8px] text-accent font-mono ml-3 transform -translate-y-1/2 drop-shadow-md"
                  style={{ left: `${(7.7386 + 180) * (100 / 360)}%`, top: `${(90 - 48.5231) * (100 / 180)}%` }}
                >ISU</div>
                
                {/* ISS Location */}
                <IssMapMarker />
             </div>
          </div>
          <div className="flex-1 min-h-0 relative rounded border border-primary/30 overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.05)]">
            <LiveFeed />
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-3 min-h-0">
          <AIMentorSidebar />
        </div>
      </main>
    </div>
  );
}
