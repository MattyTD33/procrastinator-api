import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import path from "node:path";
import { readFile } from "node:fs/promises";

/**
 * FORCE NODE RUNTIME
 * (prevents Next from edge-optimising and stripping headers)
 */
export const runtime = "nodejs";

/**
 * CONFIG
 */
const ANALYSE_URL = "https://procrastinator-api.vercel.app/api/analyse";

const ALLOWED_ORIGINS = new Set([
  "https://www.procrastinatortest.com",
  "https://procrastinatortest.com",
]);

/**
 * CORS
 */
function getCorsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://www.procrastinatortest.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

/**
 * HELPERS
 */

function toWinAnsiSafe(s) {
  return String(s ?? "")
    // common unicode punctuation -> ASCII
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/…/g, "...")
    // arrows/symbols
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/•/g, "*")
    // kill anything else outside basic Latin
    .replace(/[^\x00-\x7F]/g, "");
}

function emailOk(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

function escapeText(s) {
  return String(s ?? "")
    .replace(/\u0000/g, "")
    .replace(/[<>]/g, "")
    .trim();
}

function wrapLines(text, max = 92) {
  const words = toWinAnsiSafe(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > max) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pickEbookFilename() {
  return "general.pdf"; // default for now
}

/**
 * BUILD RESULTS PDF
 */
async function buildResultsPdf(result) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 48;

  const newPage = () => {
    page = pdf.addPage([595.28, 841.89]);
    y = 800;
  };

  const line = (txt, f = font, size = 11, gap = 16) => {
    if (y < 70) newPage();
    page.drawText(toWinAnsiSafe(escapeText(txt)), { x: left, y, size, font: f });
    y -= gap;
  };

  const para = (txt) =>
    wrapLines(escapeText(txt)).forEach((l) => line(l));

  line("Procrastinator Test — Results", bold, 18, 28);
  line(`Archetype: ${result.archetype || "—"}`, bold, 13, 20);
  line(`Confidence: ${result.confidence ?? "—"}%`, font, 11, 20);
  line("", font, 11, 10);

  line("Summary", bold, 12, 18);
  para(result.headline || "—");

  line("", font, 11, 10);
  line("Personalised explanation", bold, 12, 18);
  para(result.personalised_explanation || "—");

  line("", font, 11, 10);
  line("What’s driving it", bold, 12, 18);
  (result.key_drivers || []).forEach((x) => para(`• ${x}`));

  line("", font, 11, 10);
  line("Your best next moves", bold, 12, 18);
  (result.next_actions || []).forEach((x) => para(`• ${x}`));

  return Buffer.from(await pdf.save());
}

/**
 * SEND VIA MANDRILL
 */
async function sendMandrill({ to, subject, html, attachments }) {
  const key = process.env.MANDRILL_API_KEY;
  if (!key) throw new Error("Missing MANDRILL_API_KEY");

  const payload = {
    key,
    message: {
      from_email: process.env.MANDRILL_FROM_EMAIL,
      from_name: process.env.MANDRILL_FROM_NAME || "Procrastinator Test",
      subject,
      html,
      to: [{ email: to, type: "to" }],
      attachments,
    },
  };

  const res = await fetch(
    "https://mandrillapp.com/api/1.0/messages/send.json",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mandrill error: ${err}`);
  }
}

/**
 * POST
 */
export async function POST(req) {
  const cors = getCorsHeaders(req);

  try {
    const { email, deliveryOption, responses } = await req.json();
    const safeResponses = Array.isArray(responses)
  ? responses.map(v => (v === null || v === undefined) ? "" : String(v))
  : [];


    if (!emailOk(email)) {
      return NextResponse.json(
        { ok: false, error: "invalid_email" },
        { status: 400, headers: cors }
      );
    }

    if (!Array.isArray(responses)) {
      return NextResponse.json(
        { ok: false, error: "missing_responses" },
        { status: 400, headers: cors }
      );
    }

    // Re-run analysis server-side
    const a = await fetch(ANALYSE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: safeResponses }),

    });

    const result = JSON.parse(await a.text());

    const attachments = [];
    const option = (deliveryOption || "bundle").toLowerCase();

    if (option !== "ebook") {
      const pdf = await buildResultsPdf(result);
      attachments.push({
        type: "application/pdf",
        name: "Your-ProcrastinatorTest-Results.pdf",
        content: pdf.toString("base64"),
      });
    }

    if (option !== "results") {
      const ebookPath = path.join(
        process.cwd(),
        "assets",
        "ebooks",
        pickEbookFilename()
      );
      const ebook = await readFile(ebookPath);
      attachments.push({
        type: "application/pdf",
        name: "Your-ProcrastinatorTest-eBook.pdf",
        content: Buffer.from(ebook).toString("base64"),
      });
    }

    await sendMandrill({
      to: email,
      subject: "Your Procrastinator Test PDFs",
      html: `<p>Your requested PDF(s) are attached.</p>`,
      attachments,
    });

    return NextResponse.json({ ok: true }, { status: 200, headers: cors });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "deliver_failed" },
      { status: 500, headers: cors }
    );
  }
}