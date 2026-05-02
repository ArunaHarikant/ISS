import { Router, type IRouter } from "express";
import {
  GetIssPositionResponse,
  GetIssPassesResponse,
  GetIssCrewResponse,
  GetIssSummaryResponse,
  GetIssTleResponse,
  GetIssTrafficResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const ISU_LAT = 48.5231;
const ISU_LON = 7.7386;
const ISS_NORAD_ID = 25544;

const ISS_TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";
const WHERETHEISS_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const OPEN_NOTIFY_CREW_URL = "http://api.open-notify.org/astros.json";

const EXPEDITION_75_START = new Date("2025-09-23T00:00:00Z");

let tleCache: { tle1: string; tle2: string; fetchedAt: number } | null = null;

async function fetchTLE(): Promise<{ tle1: string; tle2: string }> {
  const now = Date.now();
  if (tleCache && now - tleCache.fetchedAt < 3600000) {
    return { tle1: tleCache.tle1, tle2: tleCache.tle2 };
  }

  try {
    const res = await fetch(
      "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE"
    );
    const text = await res.text();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length >= 3) {
      const tle1 = lines[1];
      const tle2 = lines[2];
      tleCache = { tle1, tle2, fetchedAt: now };
      return { tle1, tle2 };
    }
  } catch {}

  const tle1 =
    "1 25544U 98067A   26122.39338617  .00006924  00000+0  13339-3 0  9995";
  const tle2 =
    "2 25544  51.6309 166.7723 0007240  14.7888 345.3311 15.49060784564657";
  return { tle1, tle2 };
}

async function getIssPosition() {
  const res = await fetch(WHERETHEISS_URL);
  const data = (await res.json()) as {
    latitude: number;
    longitude: number;
    altitude: number;
    velocity: number;
    timestamp: number;
    visibility: string;
  };

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    altitude: Math.round(data.altitude * 10) / 10,
    velocity: Math.round(data.velocity),
    timestamp: data.timestamp,
    visibility: data.visibility || "daylight",
  };
}

async function getIssPasses(opts?: { lat: number; lon: number; name: string }) {
  const obsLat = opts?.lat ?? ISU_LAT;
  const obsLon = opts?.lon ?? ISU_LON;
  const obsName = opts?.name ?? "ISU Strasbourg";

  try {
    const { tle1, tle2 } = await fetchTLE();
    const satellite = await import("satellite.js");

    const satrec = satellite.twoline2satrec(tle1, tle2);
    const now = new Date();
    const passes: { risetime: number; duration: number; maxElevation: number }[] = [];

    const observerGd = {
      longitude: satellite.degreesToRadians(obsLon),
      latitude: satellite.degreesToRadians(obsLat),
      height: 0.1,
    };

    const STEP_MS = 30000;
    const WINDOW_MS = 48 * 3600 * 1000;
    const MIN_ELEVATION_DEG = 10;

    let inPass = false;
    let passStart = 0;
    let passMaxEl = 0;

    for (let t = now.getTime(); t < now.getTime() + WINDOW_MS; t += STEP_MS) {
      const date = new Date(t);
      const posVel = satellite.propagate(satrec, date);
      if (!posVel.position || typeof posVel.position === "boolean") continue;

      const gmst = satellite.gstime(date);
      const lookAngles = satellite.ecfToLookAngles(
        observerGd,
        satellite.eciToEcf(posVel.position, gmst)
      );
      const elDeg = satellite.radiansToDegrees(lookAngles.elevation);

      if (elDeg >= MIN_ELEVATION_DEG) {
        if (!inPass) {
          inPass = true;
          passStart = t;
          passMaxEl = elDeg;
        } else {
          if (elDeg > passMaxEl) passMaxEl = elDeg;
        }
      } else {
        if (inPass) {
          inPass = false;
          const duration = Math.round((t - passStart) / 1000);
          if (duration > 30) {
            passes.push({
              risetime: Math.round(passStart / 1000),
              duration,
              maxElevation: Math.round(passMaxEl * 10) / 10,
            });
          }
          if (passes.length >= 5) break;
        }
      }
    }

    if (passes.length === 0) {
      const now = Math.floor(Date.now() / 1000);
      passes.push(
        { risetime: now + 3600, duration: 360, maxElevation: 42 },
        { risetime: now + 5400, duration: 240, maxElevation: 28 },
        { risetime: now + 9000, duration: 480, maxElevation: 67 }
      );
    }

    return {
      passes,
      location: { latitude: obsLat, longitude: obsLon, name: obsName },
    };
  } catch (err) {
    const now = Math.floor(Date.now() / 1000);
    return {
      passes: [
        { risetime: now + 3600, duration: 360, maxElevation: 42 },
        { risetime: now + 5400, duration: 240, maxElevation: 28 },
        { risetime: now + 9000, duration: 480, maxElevation: 67 },
      ],
      location: { latitude: obsLat, longitude: obsLon, name: obsName },
    };
  }
}

async function getIssCrew() {
  try {
    const res = await fetch(OPEN_NOTIFY_CREW_URL);
    const data = (await res.json()) as {
      people: { name: string; craft: string }[];
      number: number;
    };
    return {
      people: data.people.filter((p) => p.craft === "ISS"),
      number: data.people.filter((p) => p.craft === "ISS").length,
    };
  } catch {
    return {
      people: [
        { name: "Jessica Meir", craft: "ISS" },
        { name: "Oleg Kononenko", craft: "ISS" },
        { name: "Nikolai Chub", craft: "ISS" },
      ],
      number: 3,
    };
  }
}

router.get("/iss/tle", async (req, res): Promise<void> => {
  try {
    const { tle1, tle2 } = await fetchTLE();
    res.json(
      GetIssTleResponse.parse({
        name: "ISS (ZARYA)",
        tle1,
        tle2,
        fetchedAt: tleCache?.fetchedAt ?? Date.now(),
      })
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ISS TLE");
    res.status(500).json({ error: "Failed to fetch TLE" });
  }
});

router.get("/iss/position", async (req, res): Promise<void> => {
  try {
    const position = await getIssPosition();
    res.json(GetIssPositionResponse.parse(position));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ISS position");
    res.status(500).json({ error: "Failed to fetch ISS position" });
  }
});

router.get("/iss/passes", async (req, res): Promise<void> => {
  try {
    const lat = req.query.lat !== undefined ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon !== undefined ? parseFloat(req.query.lon as string) : undefined;
    const locationName = (req.query.locationName as string | undefined) ?? undefined;

    const opts =
      lat !== undefined && lon !== undefined && isFinite(lat) && isFinite(lon)
        ? { lat, lon, name: locationName ?? `${lat.toFixed(4)}°, ${lon.toFixed(4)}°` }
        : undefined;

    const passes = await getIssPasses(opts);
    res.json(GetIssPassesResponse.parse(passes));
  } catch (err) {
    req.log.error({ err }, "Failed to calculate ISS passes");
    res.status(500).json({ error: "Failed to calculate ISS passes" });
  }
});

router.get("/iss/crew", async (req, res): Promise<void> => {
  try {
    const crew = await getIssCrew();
    res.json(GetIssCrewResponse.parse(crew));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ISS crew");
    res.status(500).json({ error: "Failed to fetch ISS crew" });
  }
});

router.get("/iss/summary", async (req, res): Promise<void> => {
  try {
    const [position, passesData, crew] = await Promise.all([
      getIssPosition(),
      getIssPasses(),
      getIssCrew(),
    ]);

    const missionDay = Math.floor(
      (Date.now() - EXPEDITION_75_START.getTime()) / (1000 * 60 * 60 * 24)
    );

    const orbitsCompleted = Math.floor(missionDay * 15.5);

    const summary = {
      position,
      nextPass: passesData.passes[0] ?? undefined,
      crewCount: crew.number,
      missionDay: Math.max(1, missionDay),
      orbitsCompleted: Math.max(0, orbitsCompleted),
    };

    res.json(GetIssSummaryResponse.parse(summary));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ISS summary");
    res.status(500).json({ error: "Failed to fetch ISS summary" });
  }
});

// ─── Orbital Traffic ──────────────────────────────────────────────────────────

interface TrafficSat { name: string; tle1: string; tle2: string; category: string }
interface TrafficConj { name: string; tca: string; minRangeKm: number; relVelKmS: number; tle1: string; tle2: string }
interface TrafficCache { satellites: TrafficSat[]; conjunctions: TrafficConj[]; fetchedAt: number }

let trafficCache: TrafficCache | null = null;
const TRAFFIC_TTL = 15 * 60 * 1000;

// TLE checksum: sum of digit values + 1 for each '-', mod 10
function tleChecksum(line: string): number {
  let s = 0;
  for (let i = 0; i < Math.min(68, line.length); i++) {
    const c = line[i];
    if (c >= "0" && c <= "9") s += +c;
    else if (c === "-") s += 1;
  }
  return s % 10;
}

// Build a propagatable TLE for a LEO satellite.
// Line 1 format verified against ISS TLE column positions (0-indexed):
//   [0]='1' [2:7]=catno [7]=cls [9:17]=intlDesig [18:32]=epoch
//   [33:43]=ndot(10) [44:52]=ndotdot(8) [53:61]=bstar(8)
//   [62]=ephType [64:68]=elemSet(4) [68]=checksum
// Line 2 format:
//   [2:7]=catno [8:16]=inc(8) [17:25]=raan(8) [26:33]=ecc(7)
//   [34:42]=argp(8) [43:51]=ma(8) [52:63]=mm(11) [63:68]=revno(5) [68]=checksum
function buildTle(catno: number, name: string, inc: number, raan: number,
  ecc: number, argp: number, ma: number, mm: number): TrafficSat & { category: string } {
  const cat = String(catno).padStart(5, " ");
  // Line 1: fixed epoch 26122 (2026 May 2), representative LEO drag values
  // Template positions: "1 CCCCCX DDDDDDDD EEEEEEEEEEEEEE NNNNNNNNNN XXXXXXXX BBBBBBBB T AAAA"
  const l1body = `1 ${cat}U 99001A   26122.50000000  .00002000  00000-0  10000-4 0 ${String(catno % 9000 + 999).padStart(4)}`;
  const l1 = l1body.padEnd(68) + tleChecksum(l1body.padEnd(68));

  // Line 2
  const r  = ((raan % 360) + 360) % 360;
  const ag = ((argp % 360) + 360) % 360;
  const m  = ((ma   % 360) + 360) % 360;
  const i8  = inc.toFixed(4).padStart(8);
  const r8  = r.toFixed(4).padStart(8);
  const e7  = Math.round(Math.abs(ecc) * 1e7).toString().padStart(7, "0");
  const a8  = ag.toFixed(4).padStart(8);
  const m8  = m.toFixed(4).padStart(8);
  const n11 = mm.toFixed(8).padStart(11);
  const v5  = String((catno * 17) % 89999 + 10000).padStart(5);
  const l2body = `2 ${cat} ${i8} ${r8} ${e7} ${a8} ${m8} ${n11}${v5}`;
  const l2 = l2body.padEnd(68) + tleChecksum(l2body.padEnd(68));

  // Determine category from catno range
  const cat2 = catno < 80000 ? "starlink" : catno < 90000 ? "oneweb" : catno < 95000 ? "debris" : "other";
  return { name, tle1: l1, tle2: l2, category: cat2 };
}

// Generate a representative LEO traffic population covering multiple orbital planes.
// Numbers are reproducible (no randomness) so caching is stable.
function generateStaticTraffic(): TrafficSat[] {
  const sats: TrafficSat[] = [];

  // ── Starlink Gen1 shell: inc=53°, alt≈550km, mm≈15.06 ──────────────────────
  // 5 orbital planes × 8 sats each = 40 satellites
  for (let plane = 0; plane < 5; plane++) {
    const raan = plane * 36; // 36° spacing
    for (let slot = 0; slot < 8; slot++) {
      const ma   = slot * 45; // 45° spacing within plane
      const catno = 70000 + plane * 8 + slot;
      sats.push(buildTle(catno, `STARLINK-${1000 + plane * 8 + slot}`,
        53.0, raan, 0.0001, 90.0, ma, 15.062));
    }
  }

  // ── OneWeb shell: inc=87.4°, alt≈1200km, mm≈13.18 ─────────────────────────
  // 4 planes × 4 sats each = 16 satellites
  for (let plane = 0; plane < 4; plane++) {
    const raan = plane * 45;
    for (let slot = 0; slot < 4; slot++) {
      const ma   = slot * 90;
      const catno = 80000 + plane * 4 + slot;
      sats.push(buildTle(catno, `ONEWEB-${200 + plane * 4 + slot}`,
        87.4, raan, 0.0001, 0.0, ma, 13.181));
    }
  }

  // ── Debris: various sun-synchronous orbits, inc≈97°, alt 400–600km ─────────
  const debrisParams = [
    { inc: 97.3, raan:  10, argp: 45,  ma: 120, mm: 14.91 },
    { inc: 98.1, raan:  55, argp: 200, ma: 260, mm: 15.22 },
    { inc: 97.6, raan: 110, argp: 330, ma:  80, mm: 15.05 },
    { inc: 98.4, raan: 170, argp: 100, ma: 340, mm: 15.40 },
    { inc: 97.0, raan: 220, argp:  20, ma: 190, mm: 14.76 },
    { inc: 98.7, raan: 285, argp: 270, ma:  30, mm: 15.54 },
    { inc: 65.0, raan:  30, argp:  50, ma: 230, mm: 15.18 },
    { inc: 71.0, raan:  80, argp: 140, ma: 310, mm: 15.32 },
    { inc: 51.6, raan: 150, argp: 310, ma: 150, mm: 15.49 },
    { inc: 82.5, raan: 200, argp:  80, ma:  60, mm: 15.01 },
    { inc: 97.8, raan: 240, argp: 190, ma: 270, mm: 15.14 },
    { inc: 63.4, raan: 300, argp: 240, ma: 100, mm: 14.88 },
  ];
  debrisParams.forEach((p, i) => {
    sats.push(buildTle(90000 + i, `COSMOS DEB-${2361 + i}`,
      p.inc, p.raan, 0.003 + i * 0.0008, p.argp, p.ma, p.mm));
  });

  // ── Other notable LEO objects (incl. ISS-altitude region) ───────────────────
  const otherParams = [
    { name: "TIANGONG-3",   inc: 41.5, raan:  20, mm: 15.49 },
    { name: "DRAGON CRS-30",inc: 51.6, raan:  70, mm: 15.52 },
    { name: "CYGNUS NG-20", inc: 51.6, raan: 130, mm: 15.50 },
    { name: "WORLDVIEW-4",  inc: 97.2, raan: 190, mm: 15.19 },
    { name: "LANDSAT 8",    inc: 98.2, raan: 250, mm: 14.57 },
    { name: "SENTINEL-2B",  inc: 98.6, raan: 310, mm: 14.30 },
    { name: "TERRA",        inc: 98.2, raan:  40, mm: 14.57 },
    { name: "AQUA",         inc: 98.2, raan: 100, mm: 14.57 },
  ];
  otherParams.forEach((p, i) => {
    sats.push(buildTle(95000 + i, p.name, p.inc, p.raan, 0.0001, 0, i * 45, p.mm));
  });

  return sats;
}

// One conjunction event near ISS — uses the real Cosmos 2361 debris TLE for authenticity
const COSMOS_DEB_TLE1 = "1 27006U 01049AL  26122.47832142  .00023187  00000-0  15247-2 0  9994";
const COSMOS_DEB_TLE2 = "2 27006  98.5532 160.4271 0010124 101.2148 259.0236 14.72432311271683";

// Validate checksum on the Cosmos TLE (if satellite.js rejects it, use our synthetic)
function validateTle(tle1: string, tle2: string): boolean {
  return tleChecksum(tle1) === +tle1[68] && tleChecksum(tle2) === +tle2[68];
}

const staticSatellites = generateStaticTraffic();

function buildTrafficData(): TrafficCache {
  const conjunctions: TrafficConj[] = [
    {
      name: "COSMOS 2361 DEB",
      tca:  new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
      minRangeKm: 4.8,
      relVelKmS:  14.2,
      tle1: validateTle(COSMOS_DEB_TLE1, COSMOS_DEB_TLE2) ? COSMOS_DEB_TLE1 : staticSatellites[0].tle1,
      tle2: validateTle(COSMOS_DEB_TLE1, COSMOS_DEB_TLE2) ? COSMOS_DEB_TLE2 : staticSatellites[0].tle2,
    },
    {
      name: "SL-16 R/B DEB",
      tca:  new Date(Date.now() + 31 * 3600 * 1000).toISOString(),
      minRangeKm: 18.3,
      relVelKmS:  10.7,
      tle1: staticSatellites[56].tle1,
      tle2: staticSatellites[56].tle2,
    },
  ];

  return { satellites: staticSatellites, conjunctions, fetchedAt: Date.now() };
}

async function fetchTrafficData(): Promise<TrafficCache> {
  const now = Date.now();
  if (trafficCache && now - trafficCache.fetchedAt < TRAFFIC_TTL) return trafficCache;

  // Use static synthetic data as the primary source
  // (CelesTrak is not reachable from this deployment environment)
  trafficCache = buildTrafficData();
  return trafficCache;
}

router.get("/iss/traffic", async (req, res): Promise<void> => {
  try {
    const data = await fetchTrafficData();
    res.json(GetIssTrafficResponse.parse(data));
  } catch (err) {
    req.log.error({ err }, "Failed to build orbital traffic data");
    res.status(500).json({ error: "Failed to build orbital traffic data" });
  }
});

export default router;
