import { ImageResponse } from 'next/og';
import { fetchSignerData } from '../../lib/signers';

export const revalidate = 3600;

export async function GET() {
  try {
    const { totalSignatures, needed } = await fetchSignerData();
    const remaining = Math.max(needed - totalSignatures, 0);
    const pct = Math.min(Math.round((totalSignatures / needed) * 100), 100);
    const barWidth = Math.max(pct, 8); // minimum visual width
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0c1a30',
          }}
        >
          {/* ── Red header banner ── */}
          <div
            style={{
              width: '100%',
              backgroundColor: '#c41e2a',
              padding: '50px 80px 50px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {/* Gold accent bar at top */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '8px',
                backgroundColor: '#e8a308',
                display: 'flex',
              }}
            />

            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: 'white',
                letterSpacing: '3px',
                lineHeight: 1.1,
                display: 'flex',
                marginTop: '20px',
              }}
            >
              THE CLOCK IS TICKING
            </div>
            <div
              style={{
                fontSize: 24,
                color: 'rgba(255,255,255,0.8)',
                fontStyle: 'italic',
                marginTop: '20px',
                display: 'flex',
              }}
            >
              The only guaranteed protection is an act of Congress
            </div>
          </div>

          {/* ── Main content ── */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '44px 80px 50px',
            }}
          >
            {/* ── Headline: ONLY X MORE SIGNATURES ── */}
            {remaining > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginBottom: '32px',
                }}
              >
                {/* "ONLY" on its own line */}
                <div style={{ display: 'flex', fontSize: 38, fontWeight: 900, color: '#e8a308', letterSpacing: '6px' }}>
                  ONLY
                </div>
                {/* Big number */}
                <div style={{ display: 'flex', fontSize: 140, fontWeight: 900, color: 'white', lineHeight: 1, marginTop: '4px' }}>
                  {remaining}
                </div>
                {/* "MORE SIGNATURES" */}
                <div style={{ display: 'flex', fontSize: 42, fontWeight: 900, color: '#e8a308', letterSpacing: '4px', marginTop: '4px' }}>
                  MORE SIGNATURES
                </div>
                {/* "NEEDED FOR THE DISCHARGE PETITION" */}
                <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: 'rgba(232,163,8,0.7)', marginTop: '10px', letterSpacing: '2px' }}>
                  NEEDED FOR THE DISCHARGE PETITION
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                <span style={{ fontSize: 80, fontWeight: 900, color: 'white' }}>GOAL REACHED!</span>
              </div>
            )}

            {/* ── Progress section ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Labels above bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: 'white', display: 'flex' }}>{totalSignatures} signed</span>
                <span style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'flex' }}>{needed} needed</span>
              </div>

              {/* Progress bar track */}
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '48px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Fill */}
                <div
                  style={{
                    display: 'flex',
                    width: `${barWidth}%`,
                    height: '100%',
                    borderRadius: '24px',
                    background: 'linear-gradient(90deg, #fbbf24, #22c55e)',
                  }}
                />
              </div>

              {/* Percentage + date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: '#5bb8f5', display: 'flex' }}>
                  {pct}% of the way there
                </span>
                <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                  Updated {today}
                </span>
              </div>
            </div>

            {/* ── Remaining badge ── */}
            {remaining > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '28px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: '#c41e2a',
                    borderRadius: '12px',
                    padding: '14px 32px',
                  }}
                >
                  <span style={{ fontSize: 40, fontWeight: 900, color: 'white' }}>{remaining}</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>more signatures needed</span>
                </div>
              </div>
            )}

            {/* ── CTA box ── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#e8a308',
                borderRadius: '20px',
                padding: '36px 40px',
                marginTop: '32px',
              }}
            >
              <span style={{ fontSize: 48, fontWeight: 900, color: '#0c1a30', letterSpacing: '1px' }}>TAKE ACTION TODAY</span>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#0c1a30', marginTop: '12px', display: 'flex' }}>
                VISIT{' '}
              </span>
              <span style={{ fontSize: 38, fontWeight: 900, color: '#1a3a6b', textDecoration: 'underline', marginTop: '4px', display: 'flex' }}>
                WWW.HAITITPS.ORG
              </span>
            </div>

            {/* ── Bottom tagline ── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginTop: 'auto',
                paddingTop: '24px',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.85)', display: 'flex' }}>
                330,000 Haitians could lose protection.
              </span>
              <span style={{ fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.85)', display: 'flex' }}>
                Your call to Congress makes a difference.
              </span>
            </div>

            {/* Gold accent bar at bottom */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '8px',
                backgroundColor: '#e8a308',
                display: 'flex',
              }}
            />
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1350,
        headers: {
          'Content-Disposition': 'attachment; filename="haiti-tps-update.png"',
        },
      }
    );
  } catch (e) {
    console.error('Instagram image generation failed:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
