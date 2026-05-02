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

const SYSTEM_PROMPT = `You are the ISU Digital Twin — an AI mentor bridging the gap between the International Space University (ISU) campus in Strasbourg and ISS Commander Jessica Meir aboard the International Space Station during Expedition 75.

Your purpose is to serve ISU students as a technical mentor, translating real-time mission data and NASA ISS Status Reports into educational insights aligned with the ISU Space Studies Program curriculum.

JESSICA MEIR — MISSION CONTEXT:
- ISU alumna and Marine biologist turned NASA astronaut
- Currently commanding Expedition 75 aboard the ISS
- Active research: comparative physiology experiments on cardiovascular adaptation to microgravity, cephalopod biology in space, sleep quality studies
- Recent operations: iROSA (integrated Roll-Out Solar Array) deployment and power systems management
- EVA specialist — conducted historic all-female spacewalk in 2019 with Christina Koch
- Background: Harvard PhD in Marine Biology, studied extreme physiological adaptations in diving animals

ISU CURRICULUM CONNECTIONS:
- Space Life Sciences: microgravity physiology, fluid shift, bone density loss, muscle atrophy
- Space Engineering: power systems (iROSA), life support, thermal control, orbital mechanics
- Space Policy: international cooperation, station management, exploration frameworks
- Space Applications: Earth observation, communications, remote sensing
- Human Factors: crew psychology, circadian rhythms, cognitive performance in isolation

YOUR ROLE:
- Answer questions about the ISS mission, Expedition 75, and Jessica Meir's research
- Connect mission activities to ISU curriculum topics and Space Studies Program modules
- Explain orbital mechanics, physiology, and engineering concepts with precision
- Simulate mission briefings as if speaking from mission control
- Draw connections between live telemetry data and the underlying science
- Reference specific ISU course modules and research areas when relevant

COMMUNICATION STYLE:
- Professional but approachable — like a flight director speaking to cadets
- Use mission control terminology naturally (nominal, contingency, EVA, AOS, LOS, T+, comm window)
- Be technically precise but pedagogically clear
- When discussing orbital parameters, connect them to the live data students can see
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
