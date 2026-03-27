import { Suspense } from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fetchSignerData } from './lib/signers';
import { fetchGoogleDocHtml, fetchGoogleDocTab } from './lib/googleDoc';
import ClientPage from './components/ClientPage';

interface HouseRep {
  name: string;
  party: string;
  stateDistrict: string;
  phone: string;
  area: string;
  searchTerms: string;
  targeted: boolean;
}

function loadHouseReps(): HouseRep[] {
  const csv = readFileSync(join(process.cwd(), 'data', 'house_reps.csv'), 'utf8');
  return csv
    .trim()
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map(line => {
      const [name, party, , , stateDistrict, phone, area, searchTerms, targeted] = line.replace(/\r$/, '').split(',');
      return {
        name,
        party,
        stateDistrict,
        phone,
        area: area || '',
        searchTerms: searchTerms || '',
        targeted: targeted === 'Y',
      };
    });
}

const DOC_ID = '1y03Vihs-wPSsDHG5Y9bUw7j5-qFhczDC9CsMNFfPhYk';

export default async function Home() {
  const allReps = loadHouseReps();
  const targetedReps = allReps.filter(r => r.targeted);
  const [signerData, learnContent, callScriptTemplate, emailTemplate] = await Promise.all([
    fetchSignerData(),
    fetchGoogleDocHtml(DOC_ID),
    fetchGoogleDocTab(DOC_ID, 't.rzwkn49ttbko'),
    fetchGoogleDocTab(DOC_ID, 't.s05b9d46sd46'),
  ]);
  return (
    <Suspense>
      <ClientPage
        signerData={signerData}
        allReps={allReps}
        targetedReps={targetedReps}
        learnContent={learnContent}
        callScriptTemplate={callScriptTemplate}
        emailTemplate={emailTemplate}
      />
    </Suspense>
  );
}
