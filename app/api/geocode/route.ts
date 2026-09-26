import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  const apiKey = process.env.ORS_API_KEY;

  // 1. Reverse geocoding (lat, lng -> address text)
  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json(
        { error: "Coordenadas inválidas." },
        { status: 400 }
      );
    }

    if (apiKey) {
      try {
        const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${apiKey}&point.lat=${latNum}&point.lon=${lngNum}&size=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const label = data?.features?.[0]?.properties?.label;
          if (label) {
            return NextResponse.json({ address: label, lat: latNum, lng: lngNum });
          }
        }
      } catch (err) {
        console.warn("[geocode] ORS reverse geocode failed:", err);
      }
    }

    // Fallback: OpenStreetMap Nominatim reverse geocode
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latNum}&lon=${lngNum}&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "RegresoSeguroApp/1.0" },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          address: data.display_name || `Ubicación (${latNum.toFixed(4)}, ${lngNum.toFixed(4)})`,
          lat: latNum,
          lng: lngNum,
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      address: `Ubicación (${latNum.toFixed(4)}, ${lngNum.toFixed(4)})`,
      lat: latNum,
      lng: lngNum,
    });
  }

  // 2. Forward geocoding (q: query text -> suggestions list)
  if (!q || q.trim().length < 3) {
    return NextResponse.json({ results: [] });
  }

  if (apiKey) {
    try {
      const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(
        q
      )}&size=5&boundary.country=ARG`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const results = (data?.features || []).map((f: any) => ({
          label: f.properties.label,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        }));
        if (results.length > 0) {
          return NextResponse.json({ results });
        }
      }
    } catch (err) {
      console.warn("[geocode] ORS search failed:", err);
    }
  }

  // Fallback: OpenStreetMap Nominatim search
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q
    )}&countrycodes=ar&limit=5`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RegresoSeguroApp/1.0" },
    });
    if (res.ok) {
      const data = await res.json();
      const results = (data || []).map((item: any) => ({
        label: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      return NextResponse.json({ results });
    }
  } catch (err) {
    console.error("[geocode] Nominatim search failed:", err);
  }

  return NextResponse.json({ results: [] });
}
