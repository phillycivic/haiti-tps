import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();

  if (!q) {
    return Response.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    q,
    format: 'json',
    countrycodes: 'us',
    limit: '1',
    addressdetails: '1',
    polygon_geojson: '1',
    polygon_threshold: '0.02',
  });

  const url = `https://nominatim.openstreetmap.org/search?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HaitiTPSAction/1.0 (civic advocacy tool)',
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Geocoding service error' },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return Response.json(
        { error: 'Location not found. Try a city name, ZIP code, or state.' },
        { status: 404 }
      );
    }

    const result = data[0];
    const addr = result.address || {};

    return Response.json({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      city: addr.city || addr.town || addr.village || addr.hamlet || addr.county || '',
      state: addr.state || '',
      geojson: result.geojson || null,
    });
  } catch {
    return Response.json(
      { error: 'Failed to reach geocoding service' },
      { status: 502 }
    );
  }
}
