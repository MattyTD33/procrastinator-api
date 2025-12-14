import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { responses } = await req.json();

    if (!Array.isArray(responses) || responses.length !== 15) {
      return new Response(JSON.stringify({ error: "Expected 15 responses" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // keep tokens sane
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
            {
              type: "input_text",
              text: clean.map((x, i) => `${i + 1}. ${x}`).join("\n"),
            },
          ],
        },
      ],
    });


    // SDK returns output_text (string). We parse it into JSON.
    const jsonText = out.output_text?.trim();
    const parsed = JSON.parse(jsonText);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // TEMP CORS: allow all while testing.
        // After it works, I’ll show you how to lock to your domain.
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
