import { fetchSignerData } from '../../lib/signers';
import sharp from 'sharp';

export const revalidate = 3600;

export async function GET() {
  try {
    const { totalSignatures, needed } = await fetchSignerData();
    const remaining = Math.max(needed - totalSignatures, 0);
    const pct = Math.min(Math.round((totalSignatures / needed) * 100), 100);
    const today = new Date().toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <style>
      .headline { font-family: 'Arial Black', Impact, 'Helvetica Neue', sans-serif; }
      .body { font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; }
    </style>
  </defs>

  <!-- Dark navy background -->
  <rect width="1080" height="1350" fill="#0c1a30"/>

  <!-- Red header banner -->
  <rect width="1080" height="305" fill="#c41e2a"/>

  <!-- Gold corner triangle + "Update" label -->
  <polygon points="0,0 135,0 0,135" fill="#e8a308"/>
  <text text-anchor="middle" x="48" y="52" font-size="21" font-weight="900" fill="white" class="body"
        transform="rotate(-47, 48, 48)">Update</text>

  <!-- THE CLOCK IS TICKING -->
  <text x="95" y="178" font-size="66" font-weight="900" fill="white" letter-spacing="3"
        class="headline">THE CLOCK IS TICKING</text>

  <!-- Subtitle -->
  <text x="95" y="250" font-size="25" fill="rgba(255,255,255,0.75)" font-style="italic"
        class="body">The only guaranteed protection is an act of Congress</text>

  <!-- === HEADLINE SECTION === -->
  ${remaining > 0 ? `
  <text text-anchor="middle" x="540" y="460" fill="#e8a308" font-weight="900" class="headline">
    <tspan font-size="42">ONLY  </tspan><tspan font-size="108" fill="white"> ${remaining} </tspan><tspan font-size="42"> MORE SIGNATURES</tspan>
  </text>
  <text text-anchor="middle" x="540" y="530" font-size="48" font-weight="900" fill="#e8a308"
        class="headline">NEEDED</text>
  <text text-anchor="middle" x="540" y="578" font-size="34" font-weight="700" fill="#e8a308"
        class="headline">FOR THE DISCHARGE PETITION</text>
  ` : `
  <text text-anchor="middle" x="540" y="500" font-size="72" font-weight="900" fill="white"
        class="headline">GOAL REACHED!</text>
  `}

  <!-- "218 goal" label -->
  <text text-anchor="end" x="${remaining > 0 ? 975 : 1015}" y="632" font-size="22"
        font-weight="600" fill="white" class="body">${needed} goal</text>

  <!-- === PROGRESS BAR === -->
  <!-- Gold-bordered blue bar -->
  <rect x="65" y="650" width="${remaining > 0 ? 860 : 950}" height="108" rx="8"
        fill="#1d6cd8" stroke="#e8a308" stroke-width="4"/>

  <!-- "XXX Signed (Updated as of ...)" -->
  <text x="95" y="718" fill="white" class="body">
    <tspan font-size="46" font-weight="900">${totalSignatures} Signed</tspan>
    <tspan font-size="18" fill="rgba(255,255,255,0.5)" dx="14">(Updated as of ${today})</tspan>
  </text>

  ${remaining > 0 ? `
  <!-- Red "Needed" box -->
  <rect x="929" y="650" width="86" height="108" rx="4" fill="#c41e2a"/>
  <text text-anchor="middle" x="972" y="700" font-size="44" font-weight="900" fill="white"
        class="headline">${remaining}</text>
  <text text-anchor="middle" x="972" y="738" font-size="18" font-weight="700" fill="white"
        class="body">Needed</text>
  ` : ''}

  <!-- "We are X% of the way there." -->
  <text text-anchor="middle" x="540" y="805" font-size="28" font-weight="700" fill="#5bb8f5"
        class="body">We are ${pct}% of the way there.</text>

  <!-- === CTA BOX === -->
  <rect x="65" y="855" width="950" height="190" rx="24" fill="#e8a308"/>
  <text text-anchor="middle" x="540" y="945" font-size="52" font-weight="900" fill="#0c1a30"
        class="headline">TAKE ACTION TODAY</text>
  <text text-anchor="middle" x="540" y="1005" font-size="40" font-weight="700" fill="#0c1a30"
        class="body">VISIT <tspan text-decoration="underline" fill="#1a0dab">WWW.HAITITPS.ORG</tspan></text>

  <!-- Bottom tagline -->
  <text text-anchor="middle" x="540" y="1130" font-size="30" font-weight="700" fill="white"
        class="body">Your call protects Haitians from losing protections</text>
  <text text-anchor="middle" x="540" y="1175" font-size="30" font-weight="700" fill="white"
        class="body">and getting unlawfully deported.</text>
</svg>`;

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="haiti-tps-update.png"',
      },
    });
  } catch (e) {
    console.error('Instagram image generation failed:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
