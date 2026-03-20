import XLSX from 'xlsx';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '..', 'data', 'signers.json');

// In CI, fetch from clerk.house.gov. Locally, read from file.
async function getWorkbook() {
  const url = 'https://clerk.house.gov/ExcelPetitionDetail/2026012215';
  console.log(`Fetching petition data from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return XLSX.read(Buffer.from(buffer));
}

async function main() {
  const wb = await getWorkbook();
  const ws = wb.Sheets['All Signatures'];
  if (!ws) {
    throw new Error('Sheet "All Signatures" not found');
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  // Skip header row
  const signers = rows.slice(1)
    .filter(row => row[0]) // skip empty rows
    .map(row => {
      const stDis = String(row[7] || '');
      const stateAbbr = stDis.slice(0, 2);
      const districtNum = stDis.slice(2);

      const nameParts = [row[1], row[2], row[3], row[4]].filter(Boolean);
      const fullName = nameParts.join(' ');

      return {
        name: fullName,
        state: String(row[6] || ''),
        stateAbbr,
        district: districtNum,
        stateDistrict: stDis,
        party: String(row[8] || ''),
        dateSigned: String(row[9] || ''),
      };
    });

  const data = {
    lastUpdated: new Date().toISOString(),
    totalSignatures: signers.length,
    needed: 218,
    signers,
  };

  // Only write if content changed (ignore lastUpdated)
  if (existsSync(outputPath)) {
    const existing = JSON.parse(readFileSync(outputPath, 'utf8'));
    if (existing.totalSignatures === data.totalSignatures &&
        JSON.stringify(existing.signers) === JSON.stringify(data.signers)) {
      console.log('No changes detected.');
      return;
    }
  }

  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${signers.length} signers to ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
