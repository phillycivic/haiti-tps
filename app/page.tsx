import { readFileSync } from 'fs';
import { join } from 'path';
import signerData from '../data/signers.json';
import ClientPage from './components/ClientPage';

interface TargetedRep {
  name: string;
  stateDistrict: string;
  phone: string;
  area: string;
  searchTerms: string;
}

function loadTargetedReps(): TargetedRep[] {
  const csv = readFileSync(join(process.cwd(), 'data', 'targeted.csv'), 'utf8');
  return csv
    .trim()
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map(line => {
      const [name, , , stateDistrict, phone, area, searchTerms] = line.split(',');
      return { name, stateDistrict, phone, area: area || '', searchTerms: searchTerms || '' };
    });
}

export default function Home() {
  const targetedReps = loadTargetedReps();
  return <ClientPage signerData={signerData} targetedReps={targetedReps} />;
}
