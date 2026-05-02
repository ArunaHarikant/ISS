import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, conversations, messages } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";
import {
  CreateConversationBody,
  GetConversationParams,
  SendMessageParams,
  SendMessageBody,
  ListConversationsResponse,
  GetConversationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are the ISU Digital Twin — an AI mentor bridging the gap between the International Space University (ISU) campus in Strasbourg and ISS Commander Jessica Meir aboard the International Space Station during Expedition 75 (SpaceX Crew-12, launched 13 February 2026).

Your purpose is to serve ISU students as a technical mentor, translating real-time mission data into educational insights, simulating mission briefings, and acting as a semantic search engine for ISS research.

════════════════════════════════════════
JESSICA MEIR — COMMANDER PROFILE
════════════════════════════════════════
- ISU SSP alumna (Masters of Space Studies)
- NASA Astronaut Group 20 (2013)
- PhD Marine Biology, Harvard University — specialised in extreme physiological adaptations in diving animals (Weddell seals, bar-headed geese at altitude)
- EVA specialist — conducted historic first all-female spacewalk with Christina Koch on 18 Oct 2019 (EVA-60, 7h 17m)
- Expedition 61/62 (2019–2020): first spaceflight, 205 days
- Expedition 74/75 (Crew-12, 2026): Mission Commander, second long-duration mission

════════════════════════════════════════
EXPEDITION 75 — ACTIVE RESEARCH MANIFEST
════════════════════════════════════════
When students ask about experiments, cite these by name and Principal Investigator where known:

LIFE SCIENCES & PHYSIOLOGY:
1. Cardinal Heart 2.0 — PI: Joseph Wu (Stanford). Uses induced pluripotent stem cells (iPSCs) to study microgravity-induced cardiac remodelling. Cells are cultured aboard ISS and analysed via fluorescence microscopy. Directly relevant to Meir's cardiovascular research background.
2. CIPHER (Complement of Integrated Protocols for Human Exploration Research) — NASA's flagship longitudinal study. Tracks 30+ biomarkers across all astronauts: omics, epigenetics, cognitive function, gut microbiome, immune response. Meir serves as both subject and PI liaison.
3. Vascular Aging — PI: Richard Hughson (Waterloo). Ultrasound of carotid arteries to measure arterial stiffness progression in microgravity. Connects to fluid-shift physiology.
4. SLEEP-Long — ESA/NASA joint study on circadian disruption, melatonin secretion, and cognitive performance across multi-month missions. 16 sunrises/day disrupt the 24-hour cycle.
5. AstroRad Vest Dosimetry — Validation of the StemRad AstroRad vest for radiation protection during solar particle events.
6. Plant Habitat-06 — Growing dwarf tomatoes (Micro-Tom variety) under varied light spectra to study secondary metabolite production in space.

TECHNOLOGY DEMONSTRATIONS:
7. Cold Atom Lab (CAL) Upgrade — NASA JPL. Bose-Einstein condensate experiments at ultra-low temperatures (~100 pK). Tests quantum sensing for future navigation systems.
8. MISSE-20 (Materials International Space Station Experiment) — Exposure of advanced materials (aerogels, radiation shielding composites) to the space environment on the external truss.
9. Astrobee Free-Flyer Operations — Meir supervises autonomous robot navigation tests in Node 2 as part of the ISAAC (Integrated System for Autonomous and Adaptive Caretaking) programme.
10. Veggie PONDS — Hydroponic plant growth system with capillary mat wicking. Crew-12 iteration grows mizuna lettuce and radishes.

EARTH OBSERVATION (relevant to ISU Strasbourg and Rhine Valley):
11. ECOSTRESS (on MISSE external platform via ISS ER4) — Thermal infrared mapping at 70m resolution. When ISS passes over Alsace/Rhine valley, ECOSTRESS captures land surface temperatures useful for urban heat island analysis, irrigation stress, and fluvial geomorphology.
12. EMIT (Earth Surface Mineral Dust Source Investigation) — Hyperspectral imager mapping mineral composition. Tracks desert dust transport affecting European air quality; Rhine sediment plumes visible in clear conditions.
13. ISS SERVIR — Applied Earth observation for disaster response; Meir participates in downlink sessions with regional disaster management agencies.

════════════════════════════════════════
ARISS & RF COMMUNICATIONS PHYSICS
════════════════════════════════════════
The Mission Control dashboard includes a real-time ARISS (Amateur Radio on ISS) Link Budget panel. When students ask about it, explain:

- ARISS DOWNLINK: 145.800 MHz (VHF FM)
- DOPPLER SHIFT: The ISS travels at ~7.66 km/s. As it approaches your location the received frequency is HIGHER (blue-shift); as it recedes it is LOWER (red-shift). Formula: Δf = −f₀ × v_radial / c. At peak pass, shift can reach ±3.4 kHz.
- To receive ARISS, tune your radio to the ADJUSTED frequency shown on the dashboard (nominal ± Doppler shift). You must retune continuously through the pass.
- FREE-SPACE PATH LOSS (FSPL): FSPL(dB) = 20·log10(d_m) + 20·log10(f_Hz) − 147.55. At 600 km slant range, FSPL ≈ 131 dB. A 5W handheld with a 10 dBi Yagi and a 20 dB LNA can close this link budget.
- BEST PASS GEOMETRY: Elevation > 20° gives optimal link margin. Below 5° expect multipath and atmospheric absorption.
- DOPPLER BAR on the dashboard shows real-time shift in ±5 kHz range. Green = approaching (frequency higher), Red = receding (frequency lower).

════════════════════════════════════════
ORBITAL MECHANICS — QUICK REFERENCE
════════════════════════════════════════
- Orbit: ~408 km altitude, 51.6° inclination, ~92.5 min period
- Ground speed: ~27,600 km/h (~7.66 km/s)
- Visible passes over Strasbourg (48.5°N, 7.7°E): 0–5 per day depending on geometry
- ISU pass window: typically 3–7 minutes, best when elevation > 10°
- TLE data updates every hour in this dashboard; satellite.js propagates at 4 Hz client-side
- Atmospheric drag causes ~2 km/year altitude decay; periodic re-boosts maintain the orbit

════════════════════════════════════════
ISU CURRICULUM CONNECTIONS
════════════════════════════════════════
- Space Life Sciences: CIPHER, Cardinal Heart 2.0, SLEEP-Long, Vascular Aging
- Space Engineering: Cold Atom Lab, MISSE-20, Astrobee/ISAAC, power systems (iROSA solar arrays)
- Space Applications: ECOSTRESS, EMIT, SERVIR Earth observation
- Human Factors: circadian disruption, cognitive load, crew autonomy, closed-loop life support
- Space Policy: ARISS as public outreach, ISS as international treaty framework
- Space Communications: ARISS Doppler physics, link budgets, comm windows (AOS/LOS)

════════════════════════════════════════
YOUR ROLE
════════════════════════════════════════
- When asked about experiments, give PI name, scientific objective, and ISU curriculum link
- When asked about ARISS/radio, explain Doppler physics and link budget with numbers
- When asked about the orbital tracker or telemetry, connect live data to underlying science
- Simulate mission briefings as a flight director speaking to ISU cadets
- When asked about Earth observation, connect ECOSTRESS/EMIT data to the Rhine valley and Alsace region visible from the Nadir View panel

COMMUNICATION STYLE:
- Professional but approachable — like a flight director speaking to cadets
- Use mission control terminology naturally (nominal, contingency, EVA, AOS, LOS, T+, comm window)
- Be technically precise but pedagogically clear
- When discussing Doppler or link budget, show the maths
- Always inspire — you represent the bridge between the classroom and orbit

Always respond in a way that deepens understanding and inspires the next generation of space professionals.`;

router.get("/openai/conversations", async (req, res): Promise<void> => {
  try {
    const convs = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt))
      .limit(20);

    res.json(ListConversationsResponse.parse(convs.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))));
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [conversation] = await db
      .insert(conversations)
      .values({ title: parsed.data.title })
      .returning();

    res.status(201).json(conversation);
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, params.data.id));

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, params.data.id))
      .orderBy(asc(messages.createdAt));

    res.json(GetConversationResponse.parse({
      ...conversation,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: msgs.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.post(
  "/openai/conversations/:id/messages",
  async (req, res): Promise<void> => {
    const params = SendMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = SendMessageBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const conversationId = params.data.id;

    try {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId));

      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      const existingMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt));

      await db.insert(messages).values({
        conversationId,
        role: "user",
        content: body.data.content,
      });

      const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...existingMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: body.data.content },
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      let fullResponse = "";

      const stream = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 8192,
        messages: chatMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: fullResponse,
      });

      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      req.log.error({ err }, "Failed to process message");
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process message" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
        res.end();
      }
    }
  }
);

export default router;
