import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();

/** Botswana place catalog used when external APIs are unavailable */
const BOTSWANA_PLACES = [
  {
    name: "Gaborone CBD",
    address: "Main Mall, Gaborone, Botswana",
    lat: -24.6541,
    lng: 25.9086,
  },
  {
    name: "Gaborone Bus Rank",
    address: "Gaborone Bus Rank, Gaborone, Botswana",
    lat: -24.657,
    lng: 25.908,
  },
  {
    name: "Airport Junction Mall",
    address: "Airport Junction, Gaborone, Botswana",
    lat: -24.56,
    lng: 25.93,
  },
  {
    name: "Game City Mall",
    address: "Game City, Gaborone, Botswana",
    lat: -24.678,
    lng: 25.91,
  },
  {
    name: "Riverwalk Mall",
    address: "Riverwalk, Gaborone, Botswana",
    lat: -24.6575,
    lng: 25.919,
  },
  {
    name: "Broadhurst",
    address: "Broadhurst, Gaborone, Botswana",
    lat: -24.635,
    lng: 25.93,
  },
  {
    name: "Phakalane",
    address: "Phakalane, Gaborone, Botswana",
    lat: -24.57,
    lng: 25.95,
  },
  {
    name: "Mogoditshane",
    address: "Mogoditshane, Botswana",
    lat: -24.62,
    lng: 25.86,
  },
  { name: "Tlokweng", address: "Tlokweng, Botswana", lat: -24.67, lng: 25.97 },
  {
    name: "Francistown CBD",
    address: "Francistown, Botswana",
    lat: -21.17,
    lng: 27.51,
  },
  {
    name: "Francistown Bus Rank",
    address: "Bus Rank, Francistown, Botswana",
    lat: -21.168,
    lng: 27.508,
  },
  { name: "Maun", address: "Maun, Botswana", lat: -19.983, lng: 23.416 },
  { name: "Kasane", address: "Kasane, Botswana", lat: -17.8167, lng: 25.15 },
  { name: "Palapye", address: "Palapye, Botswana", lat: -22.55, lng: 27.13 },
  { name: "Serowe", address: "Serowe, Botswana", lat: -22.383, lng: 26.7 },
  {
    name: "Lobatse",
    address: "Lobatse, Botswana",
    lat: -25.2167,
    lng: 25.6667,
  },
  { name: "Jwaneng", address: "Jwaneng, Botswana", lat: -24.601, lng: 24.728 },
  {
    name: "Selebi-Phikwe",
    address: "Selebi-Phikwe, Botswana",
    lat: -21.966,
    lng: 27.833,
  },
  {
    name: "Molepolole",
    address: "Molepolole, Botswana",
    lat: -24.406,
    lng: 25.495,
  },
  { name: "Kanye", address: "Kanye, Botswana", lat: -24.983, lng: 25.333 },
  { name: "Mahalapye", address: "Mahalapye, Botswana", lat: -23.1, lng: 26.8 },
  {
    name: "Gaborone Sir Seretse Khama Airport",
    address: "SSKA, Gaborone, Botswana",
    lat: -24.555,
    lng: 25.918,
  },
  {
    name: "UB Campus",
    address: "University of Botswana, Gaborone",
    lat: -24.66,
    lng: 25.94,
  },
  {
    name: "Block 8",
    address: "Block 8, Gaborone, Botswana",
    lat: -24.64,
    lng: 25.91,
  },
  {
    name: "Block 9",
    address: "Block 9, Gaborone, Botswana",
    lat: -24.645,
    lng: 25.905,
  },
  {
    name: "Extension 12",
    address: "Extension 12, Gaborone, Botswana",
    lat: -24.65,
    lng: 25.92,
  },
];

function localSearch(query: string) {
  const q = query.toLowerCase();
  return BOTSWANA_PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q),
  )
    .slice(0, 8)
    .map((p, i) => ({
      id: `bw-${i}-${p.name}`,
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
    }));
}

/**
 * GET /api/places/autocomplete?q=gaborone
 * Proxies place search via server (has internet) with local Botswana fallback.
 */
router.get("/autocomplete", requireAuth, async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q || q.length < 2) {
    return res.json({ success: true, data: [] });
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  // 1) Google Places Autocomplete (server-side)
  if (apiKey) {
    try {
      const autoRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&key=${apiKey}&components=country:bw`,
      );
      const autoData: any = await autoRes.json();
      if (autoData.status === "OK" && autoData.predictions?.length) {
        const results = await Promise.all(
          autoData.predictions.slice(0, 6).map(async (prediction: any) => {
            try {
              const detailsRes = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address,name&key=${apiKey}`,
              );
              const details: any = await detailsRes.json();
              const loc = details.result?.geometry?.location;
              if (!loc) return null;
              return {
                id: prediction.place_id,
                name:
                  prediction.structured_formatting?.main_text ||
                  details.result?.name ||
                  prediction.description.split(",")[0],
                address: prediction.description,
                lat: loc.lat,
                lng: loc.lng,
              };
            } catch {
              return null;
            }
          }),
        );
        const filtered = results.filter(Boolean);
        if (filtered.length > 0) {
          return res.json({ success: true, data: filtered });
        }
      }
    } catch (e) {
      console.warn("Google Places proxy failed:", e);
    }
  }

  // 2) OpenStreetMap Nominatim
  try {
    const osmRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${q}, Botswana`)}&limit=6&countrycodes=bw`,
      { headers: { "User-Agent": "NtsamaelaAPI/1.0" } },
    );
    const osmData: any = await osmRes.json();
    if (Array.isArray(osmData) && osmData.length > 0) {
      return res.json({
        success: true,
        data: osmData.map((item: any) => ({
          id: String(item.place_id || item.osm_id),
          name: item.name || item.display_name.split(",")[0],
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        })),
      });
    }
  } catch (e) {
    console.warn("Nominatim proxy failed:", e);
  }

  // 3) Local Botswana catalog
  return res.json({ success: true, data: localSearch(q) });
});

export default router;
