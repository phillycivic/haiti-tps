import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const street = searchParams.get('street');
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const zip = searchParams.get('zip');

  if (!street || !zip) {
    return Response.json(
      { error: 'Street address and ZIP code are required' },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    street,
    city: city || '',
    state: state || '',
    zip,
    benchmark: 'Public_AR_Current',
    format: 'json',
  });

  const url = `https://geocoding.geo.census.gov/geocoder/locations/address?${params}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return Response.json(
        { error: 'Geocoding service error' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const matches = data?.result?.addressMatches;

    if (!matches || matches.length === 0) {
      return Response.json(
        { error: 'Address not found. Please check your address and try again.' },
        { status: 404 }
      );
    }

    const match = matches[0];
    return Response.json({
      lat: match.coordinates.y,
      lng: match.coordinates.x,
      matchedAddress: match.matchedAddress,
    });
  } catch {
    return Response.json(
      { error: 'Failed to reach geocoding service' },
      { status: 502 }
    );
  }
}
