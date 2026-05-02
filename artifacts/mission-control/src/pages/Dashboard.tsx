import React, { useState, useEffect, useRef } from "react";
import * as satelliteJs from "satellite.js";
import {
  useGetIssPasses,
  useGetIssSummary,
  useListConversations,
  useCreateConversation,
  useGetConversation,
  useGetIssTle,
  useGetIssTraffic,
} from "@workspace/api-client-react";
import type { IssTrafficResponse } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoUrl from "@assets/International_Space_University_1777725450504.png";

// ─── Types & constants ────────────────────────────────────────────────────────
type UserLocation = { lat: number; lon: number; name: string };
const ISU_DEFAULT: UserLocation = { lat: 48.5231, lon: 7.7386, name: "ISU Strasbourg" };
const LOCATION_KEY = "isu-mc-observer-location";

function loadLocation(): UserLocation {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (raw) return JSON.parse(raw) as UserLocation;
  } catch {}
  return ISU_DEFAULT;
}

// ─── ESA star SVG logo ────────────────────────────────────────────────────────
const ESAStar = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <polygon
      points="14,1 17.5,10.5 27.5,10.5 19.5,16.5 22.5,26.5 14,20.5 5.5,26.5 8.5,16.5 0.5,10.5 10.5,10.5"
      fill="#009fda"
    />
  </svg>
);

// ─── Pulsing dot ──────────────────────────────────────────────────────────────
const PulseDot = ({ color = "bg-emerald-400" }: { color?: string }) => (
  <span className="relative flex h-2 w-2 flex-shrink-0">
    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
    <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
  </span>
);

// ─── UTC Clock ────────────────────────────────────────────────────────────────
const UtcClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-white tabular-nums text-sm">
      {time.toISOString().substring(11, 19)} UTC
    </span>
  );
};

// ─── AOS Countdown (next pass) ───────────────────────────────────────────────
const AosCountdown = ({ location }: { location: UserLocation }) => {
  const { data } = useGetIssPasses(
    { lat: location.lat, lon: location.lon, locationName: location.name },
    { query: { refetchInterval: 300_000 } }
  );
  const next = data?.passes?.[0];
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!next) return;
    const tick = () => setSecs(Math.max(0, next.risetime - Math.floor(Date.now() / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [next]);

  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-accent/30 bg-accent/5">
      <span className="text-[10px] font-mono text-accent/70 uppercase tracking-widest">AOS</span>
      <span className="font-mono text-accent text-sm tabular-nums drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
        T-{h}:{m}:{s}
      </span>
      {next && (
        <span className="text-[10px] font-mono text-muted-foreground hidden xl:inline">
          {next.maxElevation}° max
        </span>
      )}
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = ({ location }: { location: UserLocation }) => (
  <header
    className="flex items-center justify-between px-4 py-2 border-b border-primary/20 bg-background/98 backdrop-blur z-10 sticky top-0"
    style={{ boxShadow: "0 1px 30px rgba(0,159,218,0.08)" }}
  >
    {/* Left: branding */}
    <div className="flex items-center gap-3">
      <ESAStar size={26} />
      <div className="flex flex-col leading-none">
        <span className="text-[11px] font-bold tracking-[0.25em] text-primary uppercase">
          ESA Mission Control
        </span>
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
          Expedition 75 · Crew-12
        </span>
      </div>
      <div className="hidden sm:block w-px h-6 bg-primary/20 mx-1" />
      <img src={logoUrl} alt="ISU" className="hidden sm:block h-7 w-auto opacity-80" />
    </div>

    {/* Center: comms status */}
    <div className="flex items-center gap-2">
      <PulseDot color="bg-emerald-400" />
      <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest">
        Comms · Nominal
      </span>
    </div>

    {/* Right: AOS + clock */}
    <div className="flex items-center gap-3">
      <AosCountdown location={location} />
      <div className="px-3 py-1.5 rounded border border-primary/25 bg-primary/5">
        <UtcClock />
      </div>
    </div>
  </header>
);

// ─── Telemetry strip (bottom) ─────────────────────────────────────────────────
const TelemetryStrip = ({
  lat, lon, alt, vel, vis,
}: {
  lat: number | null; lon: number | null; alt: number | null; vel: number | null; vis: string;
}) => {
  const items = [
    { label: "ALT", value: alt != null ? `${alt.toFixed(1)} km` : "--- km" },
    { label: "VEL", value: vel != null ? `${vel.toFixed(0)} km/h` : "---- km/h" },
    { label: "LAT", value: lat != null ? `${lat.toFixed(4)}° ${lat >= 0 ? "N" : "S"}` : "--.---- °" },
    { label: "LON", value: lon != null ? `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}` : "----.---- °" },
    { label: "MODE", value: vis || "UNKNOWN" },
  ];
  return (
    <div
      className="flex items-center gap-px border-t border-primary/15 bg-background/95 flex-shrink-0"
      style={{ boxShadow: "0 -1px 20px rgba(0,159,218,0.05)" }}
    >
      {items.map(({ label, value }, i) => (
        <div
          key={label}
          className={`flex items-center gap-2 flex-1 px-3 py-2 ${i < items.length - 1 ? "border-r border-primary/10" : ""}`}
        >
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest flex-shrink-0">{label}</span>
          <span className="font-mono text-xs text-primary tabular-nums truncate">{value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Crew-12 roster ───────────────────────────────────────────────────────────
const CREW_12 = [
  { initials: "JM", name: "Jessica Meir",  agency: "NASA",      role: "CDR",  color: "#009fda", highlight: true  },
  { initials: "JH", name: "Jack Hathaway", agency: "NASA",      role: "PLT",  color: "#38bdf8", highlight: false },
  { initials: "SA", name: "Sophie Adenot", agency: "ESA",       role: "MS-1", color: "#f59e0b", highlight: false },
  { initials: "AF", name: "Andrey Fedyaev",agency: "Roscosmos", role: "MS-2", color: "#fb7185", highlight: false },
];

// ─── Crew Status Panel ────────────────────────────────────────────────────────
const CrewStatusPanel = () => (
  <div
    className="rounded border border-primary/20 bg-card flex flex-col overflow-hidden"
    style={{ boxShadow: "0 0 20px rgba(0,159,218,0.06)" }}
  >
    <div className="flex items-center justify-between px-3 py-2 border-b border-primary/15 bg-primary/5">
      <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary/80">Crew Status</span>
      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">All Nominal</span>
    </div>
    <div className="flex flex-col">
      {CREW_12.map((m) => (
        <div
          key={m.name}
          className="flex items-center gap-3 px-3 py-2.5 border-b border-primary/8 last:border-0"
          style={m.highlight ? { background: "rgba(0,159,218,0.07)", borderLeft: `2px solid ${m.color}` } : { borderLeft: "2px solid transparent" }}
        >
          <div
            className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold border"
            style={{ color: m.color, borderColor: `${m.color}50`, background: `${m.color}15` }}
          >
            {m.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white truncate">{m.name}</span>
              <span
                className="text-[9px] font-mono px-1 rounded flex-shrink-0"
                style={{ color: m.color, background: `${m.color}20` }}
              >
                {m.role}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{m.agency}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] font-mono text-emerald-400 uppercase">NOM</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Mission Timeline ─────────────────────────────────────────────────────────
const MissionTimeline = ({ location }: { location: UserLocation }) => {
  const { data } = useGetIssPasses(
    { lat: location.lat, lon: location.lon, locationName: location.name },
    { query: { refetchInterval: 300_000 } }
  );

  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const fmtDelta = (secs: number) => {
    if (secs < 0) return "NOW";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `T-${h}h${m.toString().padStart(2, "0")}m` : `T-${m}m${(secs % 60).toString().padStart(2, "0")}s`;
  };

  const passes = data?.passes ?? [];

  return (
    <div
      className="rounded border border-primary/20 bg-card flex flex-col overflow-hidden"
      style={{ boxShadow: "0 0 20px rgba(0,159,218,0.06)" }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary/15 bg-primary/5">
        <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary/80">
          Overhead Passes · {location.name}
        </span>
      </div>
      <div className="flex flex-col">
        {passes.slice(0, 4).map((pass, i) => {
          const delta = pass.risetime - now;
          const isNext = i === 0;
          return (
            <div
              key={pass.risetime}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-primary/8 last:border-0"
              style={isNext ? { borderLeft: "2px solid #f59e0b" } : { borderLeft: "2px solid transparent" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white tabular-nums">{fmtDelta(delta)}</span>
                  {isNext && (
                    <span className="text-[9px] font-mono px-1 rounded bg-accent/20 text-accent">NEXT</span>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground font-mono">
                  {pass.duration}s · {pass.maxElevation}° max el
                </span>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-[9px] font-mono text-muted-foreground">
                  {new Date(pass.risetime * 1000).toISOString().substring(11, 16)} UTC
                </span>
              </div>
            </div>
          );
        })}
        {passes.length === 0 && (
          <div className="px-3 py-3 text-[10px] font-mono text-muted-foreground">Calculating passes…</div>
        )}
      </div>
    </div>
  );
};

// ─── Observer Location Panel ──────────────────────────────────────────────────
const LocationPanel = ({
  location, onChange,
}: {
  location: UserLocation;
  onChange: (loc: UserLocation) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState({ lat: String(location.lat), lon: String(location.lon), name: location.name });
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const useGeo = () => {
    if (!navigator.geolocation) { setGeoError("Geolocation not supported"); return; }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoLoading(false);
        const loc: UserLocation = {
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lon: Math.round(pos.coords.longitude * 10000) / 10000,
          name: "My Location",
        };
        localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
        onChange(loc);
        setDraft({ lat: String(loc.lat), lon: String(loc.lon), name: loc.name });
        setExpanded(false);
      },
      err => { setGeoLoading(false); setGeoError(err.message); }
    );
  };

  const save = () => {
    const lat = parseFloat(draft.lat);
    const lon = parseFloat(draft.lon);
    if (!isFinite(lat) || lat < -90 || lat > 90) { setGeoError("Latitude must be −90 to 90"); return; }
    if (!isFinite(lon) || lon < -180 || lon > 180) { setGeoError("Longitude must be −180 to 180"); return; }
    const loc: UserLocation = { lat, lon, name: draft.name.trim() || `${lat}°, ${lon}°` };
    localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
    onChange(loc);
    setGeoError(null);
    setExpanded(false);
  };

  const reset = () => {
    localStorage.removeItem(LOCATION_KEY);
    onChange(ISU_DEFAULT);
    setDraft({ lat: String(ISU_DEFAULT.lat), lon: String(ISU_DEFAULT.lon), name: ISU_DEFAULT.name });
    setGeoError(null);
    setExpanded(false);
  };

  return (
    <div
      className="rounded border border-primary/20 bg-card flex flex-col overflow-hidden"
      style={{ boxShadow: "0 0 20px rgba(0,159,218,0.06)" }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary/15 bg-primary/5">
        <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary/80">Observer Location</span>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-[10px] font-mono text-primary/50 hover:text-primary uppercase tracking-wider transition-colors"
        >
          {expanded ? "▲ Close" : "▼ Edit"}
        </button>
      </div>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">{location.name}</p>
          <p className="text-[10px] font-mono text-muted-foreground tabular-nums">
            {location.lat.toFixed(4)}°{location.lat >= 0 ? "N" : "S"}&nbsp;&nbsp;
            {Math.abs(location.lon).toFixed(4)}°{location.lon >= 0 ? "E" : "W"}
          </p>
        </div>
      </div>
      {expanded && (
        <div className="flex flex-col gap-2 px-3 pb-3 pt-1 border-t border-primary/10">
          <Button
            size="sm"
            variant="outline"
            disabled={geoLoading}
            onClick={useGeo}
            className="h-7 text-xs border-primary/30 text-primary hover:bg-primary hover:text-black w-full font-mono"
          >
            {geoLoading ? "Locating…" : "⊕ Use My Location"}
          </Button>
          <div className="grid grid-cols-2 gap-1.5">
            <Input value={draft.lat} onChange={e => setDraft(d => ({ ...d, lat: e.target.value }))}
              placeholder="Lat" className="h-7 text-xs bg-black/50 border-primary/20 text-white font-mono" />
            <Input value={draft.lon} onChange={e => setDraft(d => ({ ...d, lon: e.target.value }))}
              placeholder="Lon" className="h-7 text-xs bg-black/50 border-primary/20 text-white font-mono" />
          </div>
          <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Location name" className="h-7 text-xs bg-black/50 border-primary/20 text-white" />
          {geoError && <p className="text-[10px] text-red-400 font-mono">{geoError}</p>}
          <div className="flex gap-1.5">
            <Button size="sm" onClick={save}
              className="flex-1 h-7 text-xs bg-primary text-black hover:bg-primary/80 font-mono uppercase tracking-wider">
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={reset}
              className="h-7 text-xs border-primary/20 text-muted-foreground hover:text-white">
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ARISS Ham Radio / Link Budget Panel ─────────────────────────────────────
const ARISS_FREQ_MHZ = 145.800;
const C_M_S = 299_792_458;

interface LinkData {
  elevationDeg: number;
  azimuthDeg: number;
  rangeKm: number;
  dopplerHz: number;
  fsplDb: number;
}

const HamRadioPanel = ({ userLocation }: { userLocation: UserLocation }) => {
  const { data: tleData } = useGetIssTle({
    query: { refetchInterval: 3_600_000, staleTime: 3_600_000 },
  });
  const [link, setLink] = useState<LinkData | null>(null);
  const satrecRef = useRef<satelliteJs.SatRec | null>(null);

  useEffect(() => {
    if (!tleData) return;
    satrecRef.current = satelliteJs.twoline2satrec(tleData.tle1, tleData.tle2);
  }, [tleData]);

  useEffect(() => {
    const observerGd = {
      longitude: satelliteJs.degreesToRadians(userLocation.lon),
      latitude: satelliteJs.degreesToRadians(userLocation.lat),
      height: 0.12,
    };

    const compute = () => {
      const rec = satrecRef.current;
      if (!rec) return;

      const t1 = new Date();
      const t2 = new Date(t1.getTime() + 1000);

      const pv1 = satelliteJs.propagate(rec, t1);
      const pv2 = satelliteJs.propagate(rec, t2);
      if (!pv1.position || typeof pv1.position === "boolean") return;
      if (!pv2.position || typeof pv2.position === "boolean") return;

      const gmst1 = satelliteJs.gstime(t1);
      const gmst2 = satelliteJs.gstime(t2);

      const ecf1 = satelliteJs.eciToEcf(pv1.position, gmst1);
      const ecf2 = satelliteJs.eciToEcf(pv2.position, gmst2);

      const look1 = satelliteJs.ecfToLookAngles(observerGd, ecf1);
      const look2 = satelliteJs.ecfToLookAngles(observerGd, ecf2);

      const rangeKm = look1.rangeSat;
      const rangeRateKmS = look2.rangeSat - look1.rangeSat; // km/s (positive = receding)

      // Doppler: Δf = −f₀ × v_r / c  (receding → lower frequency)
      const dopplerHz = -(ARISS_FREQ_MHZ * 1e6) * (rangeRateKmS * 1000) / C_M_S;

      // Free-space path loss: FSPL(dB) = 20log10(d_m) + 20log10(f_Hz) − 147.55
      const fsplDb =
        20 * Math.log10(rangeKm * 1000) +
        20 * Math.log10(ARISS_FREQ_MHZ * 1e6) -
        147.55;

      setLink({
        elevationDeg: satelliteJs.radiansToDegrees(look1.elevation),
        azimuthDeg: satelliteJs.radiansToDegrees(look1.azimuth),
        rangeKm,
        dopplerHz,
        fsplDb,
      });
    };

    compute();
    const id = setInterval(compute, 250);
    return () => clearInterval(id);
  }, [tleData, userLocation]);

  const aboveHorizon = link && link.elevationDeg > 0;
  const linkState = !link
    ? "NO TLE"
    : link.elevationDeg < 0
    ? "BELOW HORIZON"
    : link.elevationDeg < 5
    ? "LOW AOS"
    : link.elevationDeg < 20
    ? "MARGINAL"
    : "OPTIMAL";

  const stateColor = !link
    ? "text-muted-foreground"
    : link.elevationDeg < 0
    ? "text-red-400"
    : link.elevationDeg < 5
    ? "text-amber-400"
    : link.elevationDeg < 20
    ? "text-yellow-300"
    : "text-emerald-400";

  const adjustedMhz = link
    ? ARISS_FREQ_MHZ + link.dopplerHz / 1e6
    : ARISS_FREQ_MHZ;

  const dopplerKhz = link ? link.dopplerHz / 1000 : 0;

  // Doppler bar: ±5 kHz range mapped to −100%…+100%
  const dopplerBarPct = Math.max(-100, Math.min(100, (dopplerKhz / 5) * 100));

  const row = (label: string, value: string, accent?: boolean) => (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-primary/8 last:border-0">
      <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest flex-shrink-0">{label}</span>
      <span className={`text-[11px] font-mono tabular-nums ${accent ? stateColor : "text-white"}`}>{value}</span>
    </div>
  );

  return (
    <div
      className="rounded border border-primary/20 bg-card flex flex-col overflow-hidden"
      style={{ boxShadow: "0 0 20px rgba(0,159,218,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary/15 bg-primary/5">
        <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary/80">
          ARISS · 145.800 MHz
        </span>
        <span className={`text-[9px] font-mono uppercase tracking-wider ${stateColor}`}>{linkState}</span>
      </div>

      {/* Data rows */}
      {row("Elevation", link ? `${link.elevationDeg.toFixed(1)}°` : "---", true)}
      {row("Azimuth",   link ? `${link.azimuthDeg.toFixed(1)}°`   : "---")}
      {row("Range",     link ? `${link.rangeKm.toFixed(0)} km`     : "--- km")}
      {row("FSPL",      link ? `${link.fsplDb.toFixed(1)} dB`      : "--- dB")}

      {/* Doppler shift section */}
      <div className="px-3 pt-2 pb-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Doppler Shift</span>
          <span className={`text-[11px] font-mono tabular-nums ${dopplerKhz > 0 ? "text-emerald-400" : dopplerKhz < 0 ? "text-rose-400" : "text-white"}`}>
            {dopplerKhz >= 0 ? "+" : ""}{dopplerKhz.toFixed(2)} kHz
          </span>
        </div>
        {/* Shift bar */}
        <div className="relative h-2 w-full bg-black/50 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 w-px bg-primary/30" />
          <div
            className={`absolute top-0 h-full rounded-full transition-all duration-100 ${
              dopplerKhz >= 0 ? "bg-emerald-400/70" : "bg-rose-400/70"
            }`}
            style={{
              left:  dopplerBarPct >= 0 ? "50%"                  : `${50 + dopplerBarPct}%`,
              width: `${Math.abs(dopplerBarPct) / 2}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-muted-foreground/50">−5 kHz</span>
          <span className="text-[10px] font-mono text-primary/60 tabular-nums">
            {adjustedMhz.toFixed(4)} MHz
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/50">+5 kHz</span>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground/50 leading-tight mt-0.5">
          {aboveHorizon
            ? "Tune your radio to the adjusted frequency above to receive the ARISS downlink."
            : "ISS below horizon — monitor for AOS, then tune to adjusted frequency."}
        </p>
      </div>
    </div>
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
    if (i > 0 && Math.abs(pts[i].lon - pts[i - 1].lon) > 180) { segs.push(seg); seg = []; }
    seg.push(pts[i]);
  }
  if (seg.length) segs.push(seg);
  return segs;
};

// Color per satellite category
const TRAFFIC_COLORS: Record<string, string> = {
  starlink: "#60a5fa",
  oneweb:   "#c084fc",
  debris:   "#f87171",
  other:    "#94a3b8",
};

interface TrafficDot {
  name: string;
  lat: number;
  lon: number;
  distKm: number;
  category: string;
  isConjunction: boolean;
}

const OrbitalTracker = ({
  userLocation,
  trafficEnabled,
  trafficData,
}: {
  userLocation: UserLocation;
  trafficEnabled: boolean;
  trafficData: IssTrafficResponse | undefined;
}) => {
  const { data: tleData } = useGetIssTle({ query: { refetchInterval: 3_600_000, staleTime: 3_600_000 } });
  const [issPos, setIssPos] = useState({ lat: 0, lon: 0 });
  const [issEci, setIssEci] = useState<{ x: number; y: number; z: number } | null>(null);
  const [groundTrack, setGroundTrack] = useState<GeoPoint[]>([]);
  const [trafficDots, setTrafficDots] = useState<TrafficDot[]>([]);
  const satrec = useRef<satelliteJs.SatRec | null>(null);
  // Pre-built satrecs for traffic satellites (rebuilt when trafficData changes)
  const trafficSatrecs = useRef<{ name: string; rec: satelliteJs.SatRec; category: string; isConjunction: boolean }[]>([]);

  // Build ISS satrec + ground track
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
        track.push({ lat: satelliteJs.radiansToDegrees(geo.latitude), lon: satelliteJs.radiansToDegrees(geo.longitude), future: i >= 0 });
      }
    }
    setGroundTrack(track);
  }, [tleData]);

  // ISS 4 Hz position update
  useEffect(() => {
    if (!tleData) return;
    const update = () => {
      if (!satrec.current) return;
      const now = new Date();
      const pv = satelliteJs.propagate(satrec.current, now);
      if (pv.position && typeof pv.position !== "boolean") {
        const gmst = satelliteJs.gstime(now);
        const geo = satelliteJs.eciToGeodetic(pv.position, gmst);
        setIssPos({ lat: satelliteJs.radiansToDegrees(geo.latitude), lon: satelliteJs.radiansToDegrees(geo.longitude) });
        setIssEci({ x: pv.position.x, y: pv.position.y, z: pv.position.z });
      }
    };
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [tleData]);

  // Build traffic satrecs when data arrives
  useEffect(() => {
    if (!trafficData) { trafficSatrecs.current = []; return; }
    const conjunctionNames = new Set(trafficData.conjunctions.map(c => c.name));
    const built: typeof trafficSatrecs.current = [];
    // Regular traffic satellites
    for (const s of trafficData.satellites) {
      try {
        built.push({ name: s.name, rec: satelliteJs.twoline2satrec(s.tle1, s.tle2), category: s.category, isConjunction: false });
      } catch {}
    }
    // Conjunction objects (add/override)
    for (const c of trafficData.conjunctions) {
      try {
        built.push({ name: c.name, rec: satelliteJs.twoline2satrec(c.tle1, c.tle2), category: "debris", isConjunction: true });
        conjunctionNames.delete(c.name);
      } catch {}
    }
    trafficSatrecs.current = built;
  }, [trafficData]);

  // Traffic position update at 1 Hz (lower rate to save CPU with 150+ satellites)
  useEffect(() => {
    if (!trafficEnabled) { setTrafficDots([]); return; }
    const update = () => {
      if (!issEci || trafficSatrecs.current.length === 0) return;
      const now = new Date();
      const dots: TrafficDot[] = [];
      for (const { name, rec, category, isConjunction } of trafficSatrecs.current) {
        try {
          const pv = satelliteJs.propagate(rec, now);
          if (!pv.position || typeof pv.position === "boolean") continue;
          // 3D ECI distance to ISS
          const dx = pv.position.x - issEci.x;
          const dy = pv.position.y - issEci.y;
          const dz = pv.position.z - issEci.z;
          const distKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
          // Only show if within ~3000 km to keep the map meaningful
          if (distKm > 3000 && !isConjunction) continue;
          const gmst = satelliteJs.gstime(now);
          const geo = satelliteJs.eciToGeodetic(pv.position, gmst);
          dots.push({
            name,
            lat: satelliteJs.radiansToDegrees(geo.latitude),
            lon: satelliteJs.radiansToDegrees(geo.longitude),
            distKm,
            category,
            isConjunction,
          });
        } catch {}
      }
      setTrafficDots(dots);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [trafficEnabled, issEci, trafficData]);

  const pastSegs   = splitAtAntimeridian(groundTrack.filter(p => !p.future));
  const futureSegs = splitAtAntimeridian(groundTrack.filter(p => p.future));
  const pts = (seg: GeoPoint[]) =>
    seg.map(p => { const { x, y } = toSVG(p.lat, p.lon); return `${x.toFixed(3)},${y.toFixed(3)}`; })
      .filter(s => !s.includes("NaN")).join(" ");

  const iss = toSVG(issPos.lat, issPos.lon);
  const obs = toSVG(userLocation.lat, userLocation.lon);
  const issValid = isFinite(iss.x) && isFinite(iss.y);

  // Proximity / conjunction risk summary
  const closeObjects = trafficDots.filter(d => d.distKm < 200);
  const conjunctionObjects = trafficDots.filter(d => d.isConjunction);
  const nearestKm = closeObjects.length > 0 ? Math.min(...closeObjects.map(d => d.distKm)) : null;
  const hasConjunction = conjunctionObjects.length > 0;
  const nextTca = trafficData?.conjunctions[0];

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#060a12]">
      <img
        src="https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg"
        alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none select-none"
        draggable={false}
      />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
        {/* Grid */}
        {[-60,-30,0,30,60].map(lat => {
          const y = (90-lat)/180*50;
          return <line key={`lat${lat}`} x1="0" y1={y} x2="100" y2={y} stroke="#009fda14" strokeWidth="0.08" />;
        })}
        {[-120,-60,0,60,120].map(lon => {
          const x = (lon+180)/360*100;
          return <line key={`lon${lon}`} x1={x} y1="0" x2={x} y2="50" stroke="#009fda14" strokeWidth="0.08" />;
        })}

        {/* Traffic satellite dots (render below ISS track) */}
        {trafficEnabled && trafficDots.map((dot, i) => {
          const p = toSVG(dot.lat, dot.lon);
          if (!isFinite(p.x) || !isFinite(p.y)) return null;
          const color = dot.isConjunction ? "#f87171" : (TRAFFIC_COLORS[dot.category] ?? "#94a3b8");
          const isClose = dot.distKm < 200;
          return (
            <g key={`t${i}`}>
              <circle cx={p.x} cy={p.y} r={isClose ? 0.55 : 0.35}
                fill={color} opacity={isClose ? 0.9 : 0.55} />
              {dot.isConjunction && (
                <circle cx={p.x} cy={p.y} r="0.55" fill="none" stroke="#f87171" strokeWidth="0.25" opacity="0.8">
                  <animate attributeName="r" values="0.55;1.8;0.55" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}

        {/* ISS ground track */}
        {pastSegs.map((seg, i) => (
          <polyline key={`past${i}`} points={pts(seg)} fill="none"
            stroke="#009fda" strokeOpacity="0.22" strokeWidth="0.35"
            strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {futureSegs.map((seg, i) => (
          <polyline key={`future${i}`} points={pts(seg)} fill="none"
            stroke="#009fda" strokeOpacity="0.75" strokeWidth="0.45"
            strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1.5 0.7" />
        ))}

        {/* Observer */}
        <circle cx={obs.x} cy={obs.y} r="0.7" fill="#f59e0b" opacity="0.9" />
        <circle cx={obs.x} cy={obs.y} r="0.7" fill="none" stroke="#f59e0b" strokeWidth="0.2" opacity="0.5">
          <animate attributeName="r" values="0.7;2.2;0.7" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <text x={obs.x + 0.9} y={obs.y + 0.5} fontSize="1.4" fill="#f59e0b" fontFamily="monospace" fontWeight="bold"
          style={{ userSelect: "none" }}>
          {userLocation.name.length > 12 ? userLocation.name.slice(0, 11) + "…" : userLocation.name}
        </text>

        {/* ISS pizza-box conjunction exclusion zone (shown when traffic enabled) */}
        {trafficEnabled && issValid && (
          <rect
            x={iss.x - 1.2} y={iss.y - 0.4}
            width="2.4" height="0.8"
            fill="none" stroke="rgba(248,113,113,0.4)"
            strokeWidth="0.12" strokeDasharray="0.4 0.25"
            rx="0.05"
          />
        )}

        {/* ISS */}
        {issValid && <>
          <circle cx={iss.x} cy={iss.y} r="0.9" fill="#009fda" />
          <circle cx={iss.x} cy={iss.y} r="0.9" fill="none" stroke="#009fda" strokeWidth="0.3">
            <animate attributeName="r" values="0.9;3;0.9" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x={iss.x + 1.1} y={iss.y + 0.5} fontSize="1.4" fill="#009fda" fontFamily="monospace" fontWeight="bold">ISS</text>
        </>}
      </svg>

      {/* HUD top-left: mode label + traffic toggle */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-black/70 px-2 py-1 rounded backdrop-blur">
        <PulseDot color="bg-primary" />
        <span className="text-[10px] font-mono text-primary uppercase tracking-widest">
          Orbital Tracker · 4Hz
        </span>
      </div>

      {/* Conjunction risk banner */}
      {trafficEnabled && hasConjunction && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-red-900/80 border border-red-500/60 px-3 py-1 rounded backdrop-blur">
          <span className="text-[9px] font-mono text-red-300 uppercase tracking-widest font-bold">
            ⚠ CONJUNCTION RISK
          </span>
          {nextTca && (
            <span className="text-[9px] font-mono text-red-200 tabular-nums">
              {nextTca.name.slice(0, 16)} · {nextTca.minRangeKm.toFixed(1)} km
            </span>
          )}
        </div>
      )}

      {/* Proximity proximity alert (close but not conjunction-flagged) */}
      {trafficEnabled && !hasConjunction && nearestKm !== null && nearestKm < 100 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-amber-900/80 border border-amber-500/60 px-3 py-1 rounded backdrop-blur">
          <span className="text-[9px] font-mono text-amber-300 uppercase tracking-widest font-bold">
            ⚡ PROXIMITY ALERT · {nearestKm.toFixed(0)} km
          </span>
        </div>
      )}

      {/* Traffic legend (bottom-left when enabled) */}
      {trafficEnabled && (
        <div className="absolute bottom-8 left-2 z-10 flex flex-col gap-1 bg-black/70 px-2 py-1.5 rounded backdrop-blur">
          {[
            { cat: "starlink", label: "Starlink" },
            { cat: "oneweb",   label: "OneWeb" },
            { cat: "debris",   label: "Debris" },
            { cat: "other",    label: "Other LEO" },
          ].map(({ cat, label }) => (
            <div key={cat} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: TRAFFIC_COLORS[cat] }} />
              <span className="text-[9px] font-mono text-white/70">{label}</span>
            </div>
          ))}
          <div className="mt-0.5 pt-0.5 border-t border-white/10 text-[9px] font-mono text-white/40">
            {trafficDots.length} objects tracked
          </div>
        </div>
      )}

      {/* Bottom-right: ISS coordinates */}
      <div className="absolute bottom-2 right-2 z-10 bg-black/60 px-2 py-1 rounded backdrop-blur text-[10px] font-mono text-primary/70 tabular-nums">
        {issPos.lat.toFixed(4)}°{issPos.lat >= 0 ? "N" : "S"}&nbsp;
        {Math.abs(issPos.lon).toFixed(4)}°{issPos.lon >= 0 ? "E" : "W"}
      </div>
    </div>
  );
};

// ─── Nadir View ───────────────────────────────────────────────────────────────
const NadirView = ({ lat, lon }: { lat: number | null; lon: number | null }) => {
  const pctX = lat != null && lon != null ? (lon + 180) / 360 * 100 : 50;
  const pctY = lat != null && lon != null ? (90 - lat) / 180 * 100 : 50;
  return (
    <div className="relative w-full h-full bg-[#060a12] overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: "url(https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg)",
        backgroundSize: "800% 800%",
        backgroundPosition: `${pctX.toFixed(3)}% ${pctY.toFixed(3)}%`,
        transition: "background-position 3s ease-out",
        filter: "brightness(1.1) saturate(1.2)",
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)",
      }} />
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-black/70 px-2 py-1 rounded backdrop-blur">
        <PulseDot color="bg-emerald-400" />
        <span className="text-[10px] font-mono text-white uppercase tracking-widest">Nadir View · ISS Ground Track</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border border-primary/40 rounded-full" />
          <div className="absolute inset-[5px] border border-primary/20 rounded-full" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/40 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/40 -translate-x-1/2" />
        </div>
      </div>
      <div className="absolute bottom-2 left-2 z-10 bg-black/60 px-2 py-1 rounded backdrop-blur text-[10px] font-mono text-primary/60 uppercase">
        Alt ~410 km
      </div>
    </div>
  );
};

// ─── Contact Panel (AI Mentor as Jessica Meir comms) ─────────────────────────
const ContactPanel = () => {
  const { data: convos } = useListConversations();
  const createConv = useCreateConversation();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (convos && convos.length > 0 && !selectedId) setSelectedId(convos[0].id);
  }, [convos, selectedId]);

  const { data: convData, refetch } = useGetConversation(selectedId as number, {
    query: { enabled: !!selectedId, queryKey: ["/api/openai/conversations", selectedId] },
  });

  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startNew = () => {
    createConv.mutate(
      { data: { title: `Transmission ${new Date().toLocaleTimeString()}` } },
      { onSuccess: res => setSelectedId(res.id) }
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedId) return;
    const msg = input;
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    try {
      const response = await fetch(`/api/openai/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg }),
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
              if (json.done) { void refetch(); break; }
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
      setStreamingContent("");
    }
  };

  return (
    <div
      className="h-full flex flex-col rounded border border-primary/25 bg-card overflow-hidden"
      style={{ boxShadow: "0 0 30px rgba(0,159,218,0.1)" }}
    >
      {/* Panel header */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <PulseDot color="bg-emerald-400" />
            <span className="text-[11px] font-bold font-mono uppercase tracking-[0.15em] text-primary">
              Contact · CDR Jessica Meir
            </span>
          </div>
          <Button
            variant="outline" size="sm" onClick={startNew}
            className="h-6 text-[10px] px-2 border-primary/30 text-primary hover:bg-primary hover:text-black font-mono uppercase"
          >
            New
          </Button>
        </div>
        {/* Crew avatar row */}
        <div className="flex items-center gap-3 px-1">
          <div className="h-10 w-10 rounded-full border-2 border-primary/60 bg-primary/10 flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: "0 0 12px rgba(0,159,218,0.4)" }}>
            <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
              <circle cx="20" cy="14" r="7" fill="#009fda" opacity="0.8" />
              <path d="M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="#009fda" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-white leading-tight">Jessica Meir</p>
            <p className="text-[10px] font-mono text-muted-foreground">Mission Commander · Expedition 75</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider">Connected · 412ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3 min-h-0" ref={scrollRef}>
        {convData?.messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
              {m.role === "user" ? "ESOC" : "ISS CDR"}
            </span>
            <div className={`px-3 py-2 rounded text-xs max-w-[88%] leading-relaxed ${
              m.role === "user"
                ? "bg-primary/15 text-white border border-primary/25 rounded-tr-none"
                : "bg-[#0a1525] text-primary/90 border border-primary/15 rounded-tl-none font-mono"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">ISS CDR</span>
            <div className="px-3 py-2 rounded text-xs max-w-[88%] leading-relaxed bg-[#0a1525] text-primary/90 border border-primary/15 rounded-tl-none font-mono">
              {streamingContent}
              <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse align-middle" />
            </div>
          </div>
        )}
        {!convData?.messages.length && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full py-8 gap-2 text-center">
            <div className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#009fda" strokeWidth="1.5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                <path d="M8 12h8M12 8v8" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">Open channel to ISS</p>
            <p className="text-[10px] text-muted-foreground/60 font-mono">Send a transmission to contact<br/>Commander Meir</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-primary/20 bg-black/20">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Transmit to ISS…"
            className="bg-black/50 border-primary/25 focus-visible:ring-primary text-white font-mono text-xs rounded"
            disabled={isStreaming}
          />
          <Button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="bg-primary text-black hover:bg-primary/80 font-mono uppercase text-[10px] font-bold tracking-widest px-3 flex-shrink-0"
            style={{ boxShadow: "0 0 12px rgba(0,159,218,0.3)" }}
          >
            {isStreaming ? "…" : "Send ▶"}
          </Button>
        </form>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [location, setLocation] = useState<UserLocation>(loadLocation);
  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const { data: summaryData } = useGetIssSummary({ query: { refetchInterval: 10_000 } });
  const { data: trafficData, isFetching: trafficFetching } = useGetIssTraffic({
    query: {
      enabled: trafficEnabled,
      staleTime: 9 * 60 * 1000,
      refetchInterval: 10 * 60 * 1000,
    },
  });
  const pos = summaryData?.position;

  // Conjunction risk derived at dashboard level for telemetry strip badge
  const hasConjunctionRisk = trafficEnabled && (trafficData?.conjunctions?.length ?? 0) > 0;

  return (
    <div className="h-screen bg-background flex flex-col text-foreground font-sans overflow-hidden selection:bg-primary selection:text-black">
      {/* Subtle scanline overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,159,218,0.012) 3px, rgba(0,159,218,0.012) 4px)",
        }}
      />

      <Header location={location} />

      <main className="flex-1 min-h-0 p-3 grid grid-cols-12 gap-3 overflow-hidden">
        {/* Left column */}
        <div className="col-span-3 flex flex-col gap-3 overflow-y-auto min-h-0">
          <CrewStatusPanel />
          <MissionTimeline location={location} />
          <LocationPanel location={location} onChange={setLocation} />
          <HamRadioPanel userLocation={location} />
        </div>

        {/* Center column */}
        <div className="col-span-6 flex flex-col gap-3 min-h-0 h-full">
          {/* Traffic toggle bar */}
          <div className="flex-shrink-0 flex items-center justify-between bg-black/40 border border-primary/10 rounded px-3 py-1">
            <span className="text-[10px] font-mono text-primary/60 uppercase tracking-widest">Multi-Sat Traffic Overlay</span>
            <div className="flex items-center gap-2">
              {trafficFetching && (
                <span className="text-[9px] font-mono text-primary/50 animate-pulse">Loading TLEs…</span>
              )}
              {trafficEnabled && trafficData && (
                <span className="text-[9px] font-mono text-primary/60 tabular-nums">
                  {trafficData.satellites.length} sats · {trafficData.conjunctions.length} conj
                </span>
              )}
              {hasConjunctionRisk && (
                <span className="text-[9px] font-mono text-red-400 font-bold uppercase tracking-wider animate-pulse">
                  ⚠ CONJ RISK
                </span>
              )}
              <button
                onClick={() => setTrafficEnabled(v => !v)}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors border ${
                  trafficEnabled
                    ? "bg-primary/80 border-primary"
                    : "bg-black/60 border-primary/30"
                }`}
                aria-label="Toggle traffic overlay"
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full transition-transform ${
                    trafficEnabled ? "translate-x-4 bg-white" : "translate-x-0.5 bg-primary/40"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 relative rounded border border-primary/25 overflow-hidden"
            style={{ boxShadow: "0 0 30px rgba(0,159,218,0.07)" }}>
            <OrbitalTracker
              userLocation={location}
              trafficEnabled={trafficEnabled}
              trafficData={trafficData}
            />
          </div>
          <div className="flex-shrink-0 h-[180px] rounded border border-emerald-500/20 overflow-hidden"
            style={{ boxShadow: "0 0 20px rgba(16,185,129,0.05)" }}>
            <NadirView lat={pos?.latitude ?? null} lon={pos?.longitude ?? null} />
          </div>
        </div>

        {/* Right column: contact Jessica Meir */}
        <div className="col-span-3 min-h-0 h-full">
          <ContactPanel />
        </div>
      </main>

      <TelemetryStrip
        lat={pos?.latitude ?? null}
        lon={pos?.longitude ?? null}
        alt={pos?.altitude ?? null}
        vel={pos?.velocity ?? null}
        vis={pos?.visibility ?? ""}
      />
    </div>
  );
}
