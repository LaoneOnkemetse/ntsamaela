/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";

type ErrorBody = {
  success: false;
  error: { message: string };
};

function getBackendBase(): string | null {
  const raw = process.env.API_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  let trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  // Must have a scheme or new URL() fails; Railway APIs are HTTPS
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const backendBase = getBackendBase();
    if (!backendBase) {
      res.status(500).json({
        success: false,
        error: {
          message: "API backend URL is not configured (set API_BACKEND_URL).",
        },
      });
      return;
    }

    const pathParts = Array.isArray(req.query.path)
      ? req.query.path
      : [req.query.path];
    const path = (pathParts.filter(Boolean).join("/") || "").replace(/^\/+/, "");

    let url: URL;
    try {
      url = new URL(`${backendBase}/${path}`);
    } catch {
      res.status(500).json({
        success: false,
        error: { message: "Invalid API URL configuration." },
      });
      return;
    }

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
      const body =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
      init.body = body;
      if (!headers["content-type"]) headers["content-type"] = "application/json";
    }

    const upstream = await fetch(url.toString(), init);
    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text();

    res.status(upstream.status);
    if (contentType) res.setHeader("content-type", contentType);

    if (!text) {
      res.end();
      return;
    }

    if (contentType.includes("application/json")) {
      try {
        res.json(JSON.parse(text));
      } catch {
        res.send(text);
      }
      return;
    }

    res.send(text);
  } catch (e: any) {
    res.status(500).json({
      success: false,
      error: { message: e?.message || "Failed to reach backend API" },
    });
  }
}
