import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ALLOWED_ORIGIN = "https://www.procrastinatortest.com"; // Update with your Webflow domain

const responseHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN, // Only allow Webflow domain
  "Access-Control-Allow-Methods": "POST, OPTIONS", // Allow POST and OPTIONS
  "Access-Control-Allow-Headers": "Content-Type", // Allow Content-Type header
};

export async function POST(req) {
  try {
    const { responses } = await req.json();

    if (!Array.isArray(responses) || responses.length !== 15) {
      return new Response(JSON.stringify({ error: "Expected 15 responses" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clean = responses.map((r) => (r ?? "").toString().slice(0, 900));

    const prompt = `
    You are analysing a procrastination quiz.
    Return ONLY valid JSON with this exact shape:
    {
      "archetype": "The Avoidant Perfectionist" | "The Overwhelmed Overthinker" | "The Pressure-Driven Sprinter",
      "confidence": number (0-100),
      "headline": string,
      "personalised_explanation": string (reference at least ONE detail from the user's free-text answers),
      "key_drivers": string[] (3-6 items),
      "next_actions": string[] (3-7 items),
      "ebook": { "title": string, "hook": string }
    }
    Tone: direct, helpful, not fluffy.
    No medical or therapy claims. Practical coaching language.
    Be specific to the user’s responses.
    `;

    const out = await client.responses.create({
      model: "gpt-5",
      instructions: prompt,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: clean.map((x, i) => `${i + 1}. ${x}`).join("\n") },
          ],
        },
      ],
    });

    const jsonText = out.output_text?.trim();
    const parsed = JSON.parse(jsonText);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: responseHeaders, // Apply CORS headers here
    });
  } catch (e) {
    console.error("Error processing AI:", e);
    return new Response(JSON.stringify({ error: "Server error", message: e?.message || String(e) }), {
      status: 500,
      headers: responseHeaders, // Apply CORS headers here
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: responseHeaders, // Apply CORS headers here
  });
}
