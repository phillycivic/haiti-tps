import { fetchSignerData } from '../../lib/signers';

export const revalidate = 3600;

export async function GET() {
  try {
    const data = await fetchSignerData();
    return Response.json(data);
  } catch (err) {
    console.error('Failed to fetch signer data:', err);
    return Response.json({ error: 'Failed to fetch signer data' }, { status: 502 });
  }
}
