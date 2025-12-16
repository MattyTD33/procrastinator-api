import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import path from "node:path";
import { readFile } from "node:fs/promises";

const ALLOWED_ORIGINS = new Set([
  "https://www.procrastinatortest.com",
  "https://procrastinatortest.com"
]);

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
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

const ANALYSE_URL = "https://procrastinator-api.vercel.app/api/analyse";

const ALLOWED_ORIGINS = new Set([
  "https://www.procrastinatortest.com",
  "https://procrastinatortest.com"
]);

function getCorsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://www.procrastinatortest.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export async function OPTIONS(req) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

// ... keep your existing helper functions (PDF build, Mandrill, etc)

export async function POST(req) {
  const cors = getCorsHeaders(req);

  try {
    const { email, deliveryOption, responses } = await req.json();

    // your existing validation + analysis + PDF + mandrill send...
    // IMPORTANT: when you return, include cors headers

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "deliver_failed" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}