import type { NextRequest } from 'next/server';
import Supermemory from 'supermemory';
import Groq from 'groq-sdk';

const CONTAINER_TAG = process.env.SM_CONTAINER_TAG || 'factory_floor';

// Lazy-initialize clients inside the handler to avoid build-time failures
// when env vars are not yet set
function getClients() {
  const smClient = new Supermemory({
    apiKey: process.env.SM_API_KEY || 'placeholder',
    baseURL: process.env.SM_BASE_URL || 'http://localhost:6767',
  });
  const groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
  });
  return { smClient, groqClient };
}

const SYSTEM_PROMPT = `You are the MachineMemory.io Plant Manager Agent. Your task is to analyze the semantic episodic logs pulled from Supermemory Local.
Provide highly technical, objective, and mathematically grounded diagnostics.
Avoid conversational pleasantries or generic feedback. Always cross-reference machine anomalies with structural energy footprints.
When past fault records are available, identify patterns and recommend actions based on historical resolution data.
If memories contain timestamp information, use temporal reasoning to order events and identify escalation patterns.`;

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query?.trim()) {
      return Response.json({ error: 'query is required' }, { status: 400 });
    }

    const { smClient, groqClient } = getClients();
    // Step 1: Search Supermemory for relevant episodic memories
    let memoriesText = 'No relevant memories found.';
    let memCount = 0;

    try {
      const results = await smClient.search.memories({
        q: query,
        containerTag: CONTAINER_TAG,
        searchMode: 'hybrid',
        limit: 10,
        threshold: 0.45,
        rerank: true,
      } as Parameters<typeof smClient.search.memories>[0]);

      const items = (results as { results?: Array<{ memory?: string; chunk?: string }> }).results ?? [];
      memCount = items.length;

      if (memCount > 0) {
        memoriesText = items
          .map((r, i) => `[Memory ${i + 1}]: ${r.memory || r.chunk}`)
          .filter(Boolean)
          .join('\n\n');
      }
    } catch (smErr) {
      console.error('[Agent] Supermemory search failed:', smErr);
      memoriesText = 'Supermemory unavailable — responding from general knowledge only.';
    }

    // Step 2: Build context-injected system prompt
    const contextualSystem = `${SYSTEM_PROMPT}

RETRIEVED EPISODIC MEMORIES FROM SUPERMEMORY LOCAL (${memCount} records):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${memoriesText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyze the above episodic memories in context of the user's query. Prioritize factual data from the memories over general inference.`;

    // Step 3: Stream Groq response
    const stream = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: contextualSystem },
        { role: 'user', content: query },
      ],
      stream: true,
      max_tokens: 900,
      temperature: 0.25,
    });

    // Step 4: Return as streaming response
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) controller.enqueue(new TextEncoder().encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Memory-Count': String(memCount),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Agent API] Error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
