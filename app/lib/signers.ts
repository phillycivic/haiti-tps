import { read, utils } from 'xlsx';

export interface Signer {
  name: string;
  state: string;
  stateAbbr: string;
  district: string;
  stateDistrict: string;
  party: string;
  dateSigned: string;
}

export interface SignerData {
  lastUpdated: string;
  totalSignatures: number;
  needed: number;
  signers: Signer[];
}

const PETITION_URL = 'https://clerk.house.gov/ExcelPetitionDetail/2026012215';

export async function fetchSignerData(): Promise<SignerData> {
  const res = await fetch(PETITION_URL, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Clerk fetch failed: ${res.status}`);

  const buffer = await res.arrayBuffer();
  const wb = read(Buffer.from(buffer));
  const ws = wb.Sheets['All Signatures'];
  if (!ws) throw new Error('Sheet "All Signatures" not found');

  const rows = utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  const signers: Signer[] = rows.slice(1)
    .filter(row => row[0])
    .map(row => {
      const stDis = String(row[7] || '');
      const nameParts = [row[1], row[2], row[3], row[4]].filter(Boolean);
      return {
        name: nameParts.join(' '),
        state: String(row[6] || ''),
        stateAbbr: stDis.slice(0, 2),
        district: stDis.slice(2),
        stateDistrict: stDis,
        party: String(row[8] || ''),
        dateSigned: String(row[9] || ''),
      };
    });

  return {
    lastUpdated: new Date().toISOString(),
    totalSignatures: signers.length,
    needed: 218,
    signers,
  };
}
