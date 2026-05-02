import React, { useState, useEffect, useRef } from "react";
import * as satelliteJs from "satellite.js";
import {
  useGetIssPasses,
  useGetIssCrew,
  useGetIssSummary,
  useListConversations,
  useCreateConversation,
  useGetConversation,
  useGetIssTle,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import logoUrl from "@assets/International_Space_University_1777725450504.png";

// ─── Clock ────────────────────────────────────────────────────────────────────
const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="font-mono text-primary text-xl border border-primary/30 px-4 py-2 rounded bg-card/50 shadow-[0_0_15px_rgba(0,229,255,0.1)]">
      {time.toISOString().substring(11, 19)} UTC
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = () => (
  <header className="flex items-center justify-between p-4 border-b border-primary/20 bg-background/95 backdrop-blur z-10 sticky top-0">
    <div className="flex items-center gap-4">
      <img src={logoUrl} alt="ISU Logo" className="h-12 w-auto" />
      <div>
        <h1 className="text-2xl font-bold tracking-widest text-white">EXPEDITION 75</h1>
        <div className="flex items-center gap-2 text-sm font-mono text-primary">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
          MISSION CONTROL LIVE
        </div>
      </div>
    </div>
    <Clock />
  </header>
);

// ─── Telemetry Panel ──────────────────────────────────────────────────────────
const TelemetryPanel = ({ lat, lon, alt, vel, vis }: {
  lat: number | null; lon: number | null; alt: number | null; vel: number | null; vis: string;
}) => (
  <Card className="p-4 border-primary/30 shadow-[0_0_20px_rgba(0,229,255,0.05)] bg-card flex flex-col gap-4">
    <h2 className="text-lg font-bold text-primary/80 uppercase tracking-widest border-b border-primary/20 pb-2">
      Live Telemetry
    </h2>
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground uppercase">Altitude</span>
        <span className="font-mono text-xl text-white">{alt != null ? alt.toFixed(2) : "---"} km</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground uppercase">Velocity</span>
        <span className="font-mono text-xl text-white">{vel != null ? vel.toFixed(0) : "----"} km/h</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground uppercase">Latitude</span>
        <span className="font-mono text-xl text-white">{lat != null ? lat.toFixed(4) : "--.----"}°</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground uppercase">Longitude</span>
        <span className="font-mono text-xl text-white">{lon != null ? lon.toFixed(4) : "----.----"}°</span>
      </div>
    </div>
    <div className="flex items-center justify-between p-2 bg-primary/10 rounded border border-primary/20">
      <span className="text-xs uppercase text-primary">Visibility</span>
      <span className="font-mono text-sm uppercase text-accent">{vis || "UNKNOWN"}</span>
    </div>
  </Card>
);

// ─── Pass Countdown ───────────────────────────────────────────────────────────
const PassCountdown = () => {
  const { data: passesData } = useGetIssPasses({ query: { refetchInterval: 300_000 } });
  const nextPass = passesData?.passes?.[0];
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!nextPass) return;
    const update = () => setCountdown(Math.max(0, nextPass.risetime - Math.floor(Date.now() / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [nextPass]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `T-${h}:${m}:${sec}`;
  };

  return (
    <Card className="p-4 border-accent/30 shadow-[0_0_20px_rgba(255,170,0,0.05)] bg-card flex flex-col gap-4">
      <h2 className="text-lg font-bold text-accent/80 uppercase tracking-widest border-b border-accent/20 pb-2">
        Next International Space University (ISU) Overhead Pass
      </h2>
      <div className="flex flex-col items-center py-4">
        <span className="text-4xl font-mono text-accent drop-shadow-[0_0_10px_rgba(255,170,0,0.8)]">
          {nextPass ? fmt(countdown) : "T-00:00:00"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
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

// ─── Crew-12 roster — launched 13 Feb 2026 ────────────────────────────────────
const CREW_12 = [
  {
    initials: "JM",
    name: "Jessica Meir",
    agency: "NASA",
    role: "Mission Commander",
    detail: "Launched 13 Feb 2026 · Exp. 74/75",
    isuConnection: false,
    color: "text-primary border-primary bg-primary/20",
    badgeColor: "text-primary",
  },
  {
    initials: "JH",
    name: "Jack Hathaway",
    agency: "NASA",
    role: "Mission Pilot",
    detail: "First spaceflight",
    isuConnection: false,
    color: "text-sky-400 border-sky-400 bg-sky-400/10",
    badgeColor: "text-sky-400",
  },
  {
    initials: "SA",
    name: "Sophie Adenot",
    agency: "ESA",
    role: "Mission Specialist · εpsilon",
    detail: "ISAE-SUPAERO · First spaceflight",
    isuConnection: true,
    color: "text-amber-400 border-amber-400 bg-amber-400/10",
    badgeColor: "text-amber-400",
  },
  {
    initials: "AF",
    name: "Andrey Fedyaev",
    agency: "Roscosmos",
    role: "Mission Specialist",
    detail: "Second long-duration mission",
    isuConnection: false,
    color: "text-rose-400 border-rose-400 bg-rose-400/10",
    badgeColor: "text-rose-400",
  },
];

// ─── Commander Panel ──────────────────────────────────────────────────────────
const CommanderPanel = () => {
  const { data: summary } = useGetIssSummary({ query: { refetchInterval: 10_000 } });

  return (
    <Card className="p-4 border-primary/30 bg-card flex flex-col gap-4">
      <h2 className="text-lg font-bold text-primary/80 uppercase tracking-widest border-b border-primary/20 pb-2">
        Crew-12 Manifest
      </h2>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col p-2 bg-black/40 rounded border border-white/5">
          <span className="text-xs text-muted-foreground uppercase">Mission Day</span>
          <span className="font-mono text-white">{summary?.missionDay ?? "—"}</span>
        </div>
        <div className="flex flex-col p-2 bg-black/40 rounded border border-white/5">
          <span className="text-xs text-muted-foreground uppercase">Orbits</span>
          <span className="font-mono text-white">{summary?.orbitsCompleted ?? "—"}</span>
        </div>
      </div>

      {/* Crew cards */}
      <div className="flex flex-col gap-2">
        {CREW_12.map((member) => (
          <div
            key={member.name}
            className={`flex items-start gap-3 p-3 rounded border ${
              member.isuConnection
                ? "border-amber-400/30 bg-amber-400/5"
                : "border-white/5 bg-black/30"
            }`}
          >
            <div
              className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border ${member.color}`}
            >
              {member.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold text-sm leading-tight">{member.name}</span>
                <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 ${member.badgeColor}`}>
                  {member.agency}
                </span>
              </div>
              <p className="text-xs text-primary/70 font-mono mt-0.5">{member.role}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{member.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Orbital Tracker (4 Hz, satellite.js) ────────────────────────────────────
interface GeoPoint { lat: number; lon: number; future: boolean }

const toSVG = (lat: number, lon: number) => ({
  x: ((lon + 180) / 360) * 100,
  y: ((90 - lat) / 180) * 50,
});

const splitAtAntimeridian = (pts: GeoPoint[]): GeoPoint[][] => {
  const segs: GeoPoint[][] = [];
  let seg: GeoPoint[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i > 0 && Math.abs(pts[i].lon - pts[i - 1].lon) > 180) {
      segs.push(seg);
      seg = [];
    }
    seg.push(pts[i]);
  }
  if (seg.length) segs.push(seg);
  return segs;
};

const OrbitalTracker = () => {
  const { data: tleData } = useGetIssTle({
    query: { refetchInterval: 3_600_000, staleTime: 3_600_000 },
  });

  const [issPos, setIssPos] = useState({ lat: 0, lon: 0 });
  const [groundTrack, setGroundTrack] = useState<GeoPoint[]>([]);
  const satrec = useRef<satelliteJs.SatRec | null>(null);

  // Build satrec + ground track whenever TLE updates
  useEffect(() => {
    if (!tleData) return;
    const rec = satelliteJs.twoline2satrec(tleData.tle1, tleData.tle2);
    satrec.current = rec;

    const track: GeoPoint[] = [];
    const now = Date.now();
    for (let i = -20; i <= 100; i += 0.5) {
      const t = new Date(now + i * 60_000);
      const pv = satelliteJs.propagate(rec, t);
      if (pv.position && typeof pv.position !== "boolean") {
        const gmst = satelliteJs.gstime(t);
        const geo = satelliteJs.eciToGeodetic(pv.position, gmst);
        track.push({
          lat: satelliteJs.radiansToDegrees(geo.latitude),
          lon: satelliteJs.radiansToDegrees(geo.longitude),
          future: i >= 0,
        });
      }
    }
    setGroundTrack(track);
  }, [tleData]);

  // 4 Hz position update
  useEffect(() => {
    if (!tleData) return;
    const update = () => {
      if (!satrec.current) return;
      const now = new Date();
      const pv = satelliteJs.propagate(satrec.current, now);
      if (pv.position && typeof pv.position !== "boolean") {
        const gmst = satelliteJs.gstime(now);
        const geo = satelliteJs.eciToGeodetic(pv.position, gmst);
        setIssPos({
          lat: satelliteJs.radiansToDegrees(geo.latitude),
          lon: satelliteJs.radiansToDegrees(geo.longitude),
        });
      }
    };
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [tleData]);

  const pastSegs  = splitAtAntimeridian(groundTrack.filter(p => !p.future));
  const futureSegs = splitAtAntimeridian(groundTrack.filter(p => p.future));

  const pts = (seg: GeoPoint[]) =>
    seg
      .map(p => { const { x, y } = toSVG(p.lat, p.lon); return `${x.toFixed(3)},${y.toFixed(3)}`; })
      .filter(s => !s.includes("NaN"))
      .join(" ");

  const iss = toSVG(issPos.lat, issPos.lon);
  const isu = toSVG(48.5231, 7.7386);
  const issValid = isFinite(iss.x) && isFinite(iss.y);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#050e1a]">
      {/* NASA Black Marble background */}
      <img
        src="https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none select-none"
        draggable={false}
      />

      {/* SVG overlay */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        {/* Latitude/longitude grid */}
        {[-60, -30, 0, 30, 60].map(lat => {
          const y = (90 - lat) / 180 * 50;
          return <line key={`lat${lat}`} x1="0" y1={y} x2="100" y2={y} stroke="#00e5ff18" strokeWidth="0.08" />;
        })}
        {[-120, -60, 0, 60, 120].map(lon => {
          const x = (lon + 180) / 360 * 100;
          return <line key={`lon${lon}`} x1={x} y1="0" x2={x} y2="50" stroke="#00e5ff18" strokeWidth="0.08" />;
        })}

        {/* Past track — dim solid */}
        {pastSegs.map((seg, i) => (
          <polyline
            key={`past${i}`}
            points={pts(seg)}
            fill="none"
            stroke="#00e5ff"
            strokeOpacity="0.25"
            strokeWidth="0.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Future track — brighter dashed */}
        {futureSegs.map((seg, i) => (
          <polyline
            key={`future${i}`}
            points={pts(seg)}
            fill="none"
            stroke="#00e5ff"
            strokeOpacity="0.75"
            strokeWidth="0.45"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1.5 0.7"
          />
        ))}

        {/* ISU campus */}
        <circle cx={isu.x} cy={isu.y} r="0.7" fill="#ffaa00" opacity="0.9" />
        <circle cx={isu.x} cy={isu.y} r="1.4" fill="none" stroke="#ffaa00" strokeWidth="0.2" opacity="0.5">
          <animate attributeName="r" values="0.7;2;0.7" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <text x={isu.x + 0.9} y={isu.y + 0.5} fontSize="1.5" fill="#ffaa00" fontFamily="monospace" fontWeight="bold">ISU</text>

        {/* ISS position — only render once satellite.js gives a valid fix */}
        {issValid && (
          <>
            <circle cx={iss.x} cy={iss.y} r="0.9" fill="#00e5ff" />
            <circle cx={iss.x} cy={iss.y} r="0.9" fill="none" stroke="#00e5ff" strokeWidth="0.3">
              <animate attributeName="r" values="0.9;3;0.9" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <text x={iss.x + 1.1} y={iss.y + 0.5} fontSize="1.5" fill="#00e5ff" fontFamily="monospace" fontWeight="bold">ISS</text>
          </>
        )}
      </svg>

      {/* HUD label */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-black/60 px-2 py-1 rounded backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-xs font-mono text-primary uppercase tracking-widest">ORBITAL TRACKER · 4Hz</span>
      </div>

      {/* Bottom HUD: live lat/lon */}
      <div className="absolute bottom-2 right-2 z-10 bg-black/60 px-2 py-1 rounded backdrop-blur text-xs font-mono text-primary/70 tabular-nums">
        {issPos.lat.toFixed(4)}°{issPos.lat >= 0 ? "N" : "S"} &nbsp;
        {Math.abs(issPos.lon).toFixed(4)}°{issPos.lon >= 0 ? "E" : "W"}
      </div>
    </div>
  );
};

// ─── Sub-Orbital Earth View ───────────────────────────────────────────────────
const SubOrbitalView = ({ lat, lon }: { lat: number | null; lon: number | null }) => {
  const issPctX = lat != null && lon != null ? (lon + 180) / 360 * 100 : 50;
  const issPctY = lat != null && lon != null ? (90 - lat) / 180 * 100 : 50;

  return (
    <div className="relative w-full h-full bg-[#050e1a] overflow-hidden">
      {/* Zoomed Earth background — 8× zoom centres on the ISS ground-track */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg)",
          backgroundSize: "800% 800%",
          backgroundPosition: `${issPctX.toFixed(3)}% ${issPctY.toFixed(3)}%`,
          transition: "background-position 3s ease-out",
          filter: "brightness(1.15) saturate(1.2)",
        }}
      />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* HUD label */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-black/70 px-2 py-1 rounded backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="text-xs font-mono text-white uppercase tracking-widest">NADIR VIEW · INT'L SPACE STATION (ISS) GROUND TRACK</span>
      </div>

      {/* Targeting reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 border border-primary/40 rounded-full" />
          <div className="absolute inset-[6px] border border-primary/20 rounded-full" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/40 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/40 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
        </div>
      </div>

      {/* Coordinates */}
      {lat != null && lon != null && (
        <div className="absolute bottom-2 right-2 z-10 bg-black/60 px-2 py-1 rounded backdrop-blur text-xs font-mono text-primary/80 tabular-nums">
          {Math.abs(lat).toFixed(4)}°{lat >= 0 ? "N" : "S"}&nbsp;&nbsp;
          {Math.abs(lon).toFixed(4)}°{lon >= 0 ? "E" : "W"}
        </div>
      )}

      {/* Altitude badge */}
      <div className="absolute bottom-2 left-2 z-10 bg-black/60 px-2 py-1 rounded backdrop-blur text-xs font-mono text-primary/60 uppercase">
        Alt ~410 km
      </div>
    </div>
  );
};

// ─── AI Mentor Sidebar ────────────────────────────────────────────────────────
const AIMentorSidebar = () => {
  const { data: convos } = useListConversations();
  const createConv = useCreateConversation();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (convos && convos.length > 0 && !selectedId) setSelectedId(convos[0].id);
  }, [convos, selectedId]);

  const { data: convData } = useGetConversation(selectedId as number, {
    query: { enabled: !!selectedId, queryKey: ["/api/openai/conversations", selectedId] },
  });

  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startNew = () => {
    createConv.mutate(
      { data: { title: `Briefing ${new Date().toLocaleTimeString()}` } },
      { onSuccess: res => setSelectedId(res.id) }
    );
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg }),
      });
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.done) break;
              if (json.content) {
                setStreamingContent(prev => prev + json.content);
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            } catch {}
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Digital Twin Mentor
        </h2>
        <Button
          variant="outline" size="sm" onClick={startNew}
          className="h-7 text-xs border-primary/30 text-primary hover:bg-primary hover:text-black"
        >
          New Briefing
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4" ref={scrollRef}>
        {convData?.messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <span className="text-[10px] text-muted-foreground uppercase mb-1">
              {m.role === "user" ? "You" : "Mentor"}
            </span>
            <div className={`p-3 rounded max-w-[85%] text-sm ${
              m.role === "user"
                ? "bg-primary/20 text-white border border-primary/30 rounded-tr-none"
                : "bg-black/50 text-primary border border-primary/10 rounded-tl-none font-mono leading-relaxed"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-muted-foreground uppercase mb-1">Mentor</span>
            <div className="p-3 rounded max-w-[85%] text-sm bg-black/50 text-primary border border-primary/10 rounded-tl-none font-mono leading-relaxed">
              {streamingContent}
              <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse align-middle" />
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
          <Button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="bg-primary text-black hover:bg-primary/80 rounded-none font-mono uppercase text-xs font-bold tracking-widest"
          >
            Send
          </Button>
        </form>
      </div>
    </Card>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  // Pull live position from satellite.js at 4Hz — share with TelemetryPanel
  const { data: tleData } = useGetIssTle({
    query: { refetchInterval: 3_600_000, staleTime: 3_600_000 },
  });
  const { data: summaryData } = useGetIssSummary({ query: { refetchInterval: 10_000 } });

  // Keep a live lat/lon/alt/vel/vis from the summary (refreshed every 10s)
  // The OrbitalTracker computes smooth position independently via satellite.js
  const pos = summaryData?.position;

  return (
    <div className="h-screen bg-background flex flex-col text-foreground font-sans overflow-hidden selection:bg-primary selection:text-black">
      <Header />
      <main className="flex-1 min-h-0 p-4 grid grid-cols-12 gap-4 overflow-hidden">

        {/* Left column */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto min-h-0">
          <TelemetryPanel
            lat={pos?.latitude ?? null}
            lon={pos?.longitude ?? null}
            alt={pos?.altitude ?? null}
            vel={pos?.velocity ?? null}
            vis={pos?.visibility ?? ""}
          />
          <PassCountdown />
          <CommanderPanel />
        </div>

        {/* Center column: orbital tracker (top) + live Earth view (bottom) */}
        <div className="col-span-6 flex flex-col gap-4 min-h-0 h-full">
          <div className="min-h-0 flex-1 relative rounded border border-primary/30 overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.08)]">
            <OrbitalTracker />
          </div>
          <div className="flex-shrink-0 h-[200px] rounded border border-emerald-500/20 overflow-hidden shadow-[0_0_20px_rgba(52,211,153,0.05)]">
            <SubOrbitalView lat={pos?.latitude ?? null} lon={pos?.longitude ?? null} />
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-3 min-h-0 h-full">
          <AIMentorSidebar />
        </div>
      </main>
    </div>
  );
}
