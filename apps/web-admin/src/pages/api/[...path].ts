/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

type ErrorBody = {
  success: false;
  error: { message: string };
};

function getBackendBase(): string | null {
  const raw = process.env.API_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  const trimmed = raw.replace(/\/$/, "");
  // Ensure we target the backend API prefix.
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const backendBase = getBackendBase();
  if (!backendBase) {
    const body: ErrorBody = {
      success: false,
      error: {
        message: "API backend URL is not configured (set API_BACKEND_URL).",
      },
    };
    res.status(500).json(body);
    return;
  }

  const pathParts = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path];
  const path = pathParts.filter(Boolean).join("/");

  const url = new URL(`${backendBase}/${path}`);
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path") continue;
    if (Array.isArray(value))
      value.forEach((v) => url.searchParams.append(key, String(v)));
    else if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {};
  if (req.headers.authorization)
    headers.authorization = String(req.headers.authorization);
  if (req.headers["content-type"])
    headers["content-type"] = String(req.headers["content-type"]);

  const method = (req.method || "GET").toUpperCase();
  const init: RequestInit = { method, headers };

  if (method !== "GET" && method !== "HEAD") {
    // Next.js parses JSON bodies by default for API routes.
    // Our admin/client requests are JSON, so forward as JSON.
    const body =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    init.body = body;
    if (!headers["content-type"]) headers["content-type"] = "application/json";
  }

  try {
    const upstream = await fetch(url.toString(), init);
    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text();

    res.status(upstream.status);
    if (contentType) res.setHeader("content-type", contentType);

    if (!text) {
      res.end();
      return;
    }

    // Prefer JSON when the upstream indicates it.
    if (contentType.includes("application/json")) {
      res.json(JSON.parse(text));
      return;
    }

    res.send(text);
  } catch (e: any) {
    const body: ErrorBody = {
      success: false,
      error: { message: e?.message || "Failed to reach backend API" },
    };
    res.status(502).json(body);
  }
}
