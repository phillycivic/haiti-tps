export default function FactSheet() {
  const states = [
    { name: 'Florida', count: '158,000' },
    { name: 'New York', count: '40,000' },
    { name: 'Massachusetts', count: '19,000' },
    { name: 'New Jersey', count: '16,000' },
    { name: 'Pennsylvania', count: '15,000' },
    { name: 'Ohio', count: '14,000' },
    { name: 'Georgia', count: '11,000' },
    { name: 'Indiana', count: '11,000' },
  ];

  const metros = [
    { city: 'Miami', amount: '$1.5 billion' },
    { city: 'New York', amount: '$1.1 billion' },
    { city: 'Boston', amount: '$418 million' },
    { city: 'Orlando', amount: '$329 million' },
    { city: 'Tampa', amount: '$125 million' },
    { city: 'Atlanta', amount: '$119 million' },
  ];

  const midCities = [
    { city: 'Allentown, PA', amount: '$197 million' },
    { city: 'Indianapolis, IN', amount: '$136 million' },
    { city: 'Port St. Lucie, FL', amount: '$134 million' },
    { city: 'Springfield, OH', amount: '$91 million' },
    { city: 'Jacksonville, FL', amount: '$56 million' },
    { city: 'Columbus, OH', amount: '$44 million' },
  ];

  const occupations = [
    { icon: '🍳', count: '22,000', title: 'cooks and servers', detail: 'serving 880,000 meals daily' },
    { icon: '🤲', count: '8,000', title: 'caregivers', detail: 'serving 12,000 children and aging parents' },
    { icon: '📦', count: '22,000', title: 'stockers and packers', detail: 'handling millions of boxes daily' },
    { icon: '🚗', count: '6,000', title: 'vehicle cleaners', detail: 'detailing 30,000 cars each week' },
    { icon: '🛒', count: '14,000', title: 'retail staff', detail: 'serving a million customers daily' },
    { icon: '🏨', count: '5,000', title: 'hotel cleaning staff', detail: 'turning over 60,000 rooms daily' },
    { icon: '🩺', count: '13,000', title: 'nursing assistants', detail: 'serving 65,000 patients daily' },
    { icon: '🏠', count: '4,000', title: 'property managers', detail: 'overseeing 200,000 individual dwellings' },
    { icon: '🌾', count: '15,000', title: 'agricultural workers', detail: 'harvesting 5,000 acres daily' },
    { icon: '🚕', count: '3,000', title: 'taxi drivers', detail: 'moving 48,000 people daily' },
    { icon: '🚚', count: '9,000', title: 'drivers', detail: 'delivering 900,000 parcels daily' },
    { icon: '🔧', count: '3,000', title: 'mechanics', detail: 'fixing 7,000 vehicles daily' },
    { icon: '🛡️', count: '7,000', title: 'security guards', detail: 'providing safety to 700,000 persons daily' },
    { icon: '🌿', count: '3,000', title: 'landscapers', detail: 'maintaining 150,000 properties weekly' },
    { icon: '🏭', count: '7,000', title: 'factory workers', detail: 'producing millions of items weekly' },
    { icon: '🎒', count: '3,000', title: 'school assistants', detail: 'supporting 57,000 students daily' },
  ];

  const stateBreakdowns = [
    {
      state: 'Florida',
      economic: '$2.6 billion',
      federal: '$300 million',
      stateLocal: '$306 million',
      workforce: '93,000',
      jobs: 'cooks and servers (16,000), agricultural workers (12,000), stockers and packers (8,000), security guards (5,000), and nursing assistants (4,000)',
    },
    {
      state: 'Pennsylvania',
      economic: '$235 million',
      federal: '$54 million',
      stateLocal: '$31 million',
      workforce: '7,000',
      jobs: 'agricultural workers (3,000) and retail staff (1,000)',
    },
    {
      state: 'New York',
      economic: '$863 million',
      federal: '$140 million',
      stateLocal: '$141 million',
      workforce: '25,000',
      jobs: 'caregivers (5,000), nursing assistants (2,000), mechanics (2,000), security guards (1,000), and hotel cleaning staff (1,000)',
    },
    {
      state: 'Ohio',
      economic: '$160 million',
      federal: '$18 million',
      stateLocal: '$21 million',
      workforce: '5,000',
      jobs: 'stockers and packers (2,000), delivery drivers (1,000), and caregivers (1,000)',
    },
    {
      state: 'Massachusetts',
      economic: '$481 million',
      federal: '$88 million',
      stateLocal: '$59 million',
      workforce: '10,000',
      jobs: 'retail staff (2,000), nursing assistants (1,000), and stockers and packers (1,000)',
    },
    {
      state: 'Georgia',
      economic: '$151 million',
      federal: '$24 million',
      stateLocal: '$19 million',
      workforce: '7,000',
      jobs: 'property managers (2,000), stockers and packers (1,000), and nursing assistants (1,000)',
    },
    {
      state: 'New Jersey',
      economic: '$264 million',
      federal: '$36 million',
      stateLocal: '$34 million',
      workforce: '9,000',
      jobs: 'nursing assistants (2,000), retail staff (1,000), and stockers and packers (1,000)',
    },
    {
      state: 'Indiana',
      economic: '$209 million',
      federal: '$27 million',
      stateLocal: '$28 million',
      workforce: '7,000',
      jobs: 'stockers and packers (3,000) and delivery drivers (1,000)',
    },
  ];

  return (
    <div className="space-y-6 pb-6 sm:pb-8">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">

        {/* ── Title ── */}
        <div className="relative bg-[#1a1a2e] text-white px-6 sm:px-8 py-8 sm:py-10 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07]" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, currentColor 20px, currentColor 21px)',
          }} />
          <div className="relative">
            <p className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase mb-3">January 2026</p>
            <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight">
              Haitian TPS Holders<br />Make the U.S. Stronger
            </h2>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-7">

          {/* ── 330,000 banner ── */}
          <div className="bg-amber-400 text-[#1a1a2e] rounded-lg px-5 py-3.5 text-center font-extrabold text-base sm:text-lg shadow-sm">
            <span className="text-2xl sm:text-3xl">330,000</span>{' '}
            Haitian Temporary Protected Status (TPS) holders live across the U.S.
          </div>

          {/* ── State population row ── */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
            {states.map(s => (
              <div key={s.name} className="text-center bg-gray-50 rounded-lg py-3 px-1">
                <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide leading-tight">{s.name}</p>
                <p className="text-base sm:text-lg font-extrabold text-gray-900 mt-0.5">{s.count}</p>
              </div>
            ))}
          </div>

          {/* ── Economic contribution banner ── */}
          <div className="bg-[#2563eb] text-white rounded-lg px-5 py-4 text-center text-sm sm:text-base leading-relaxed shadow-sm">
            Haitian TPS holders contribute an estimated <strong className="text-amber-300 text-base sm:text-lg">$5.9 billion</strong> to the U.S. economy each year, and annually pay <strong className="text-amber-300">$805 million</strong> in federal and payroll taxes and <strong className="text-amber-300">$755 million</strong> in state and local taxes.
          </div>

          {/* ── Metro + mid-sized city tables ── */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Metro */}
            <div className="rounded-lg overflow-hidden border border-blue-200">
              <div className="bg-[#2563eb] text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2">
                <span className="text-base">🏙️</span>
                Contributions to metro economies
              </div>
              <div className="divide-y divide-gray-100">
                {metros.map((m, i) => (
                  <div key={m.city} className={`flex justify-between px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-blue-50/40' : 'bg-white'}`}>
                    <span className="text-gray-700">{m.city}</span>
                    <span className="font-extrabold text-gray-900">{m.amount}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mid-sized */}
            <div className="rounded-lg overflow-hidden border border-blue-200">
              <div className="bg-[#2563eb] text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2">
                <span className="text-base">🏘️</span>
                Contributions to mid-sized cities
              </div>
              <div className="divide-y divide-gray-100">
                {midCities.map((m, i) => (
                  <div key={m.city} className={`flex justify-between px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-blue-50/40' : 'bg-white'}`}>
                    <span className="text-gray-700">{m.city}</span>
                    <span className="font-extrabold text-gray-900">{m.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 200,000 workforce banner ── */}
          <div className="bg-amber-400 text-[#1a1a2e] rounded-lg px-5 py-3.5 text-center font-extrabold text-base sm:text-lg shadow-sm">
            <span className="text-2xl sm:text-3xl">200,000</span>{' '}
            Haitian TPS holders are already in the U.S. workforce.
          </div>

          <p className="text-center text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
            Forcing Haitian TPS holders out of their jobs would drive up costs for everyday Americans, raising the prices of food, goods, health care, and critical services.
          </p>

          {/* ── Occupations grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {occupations.map(o => (
              <div key={o.title} className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                <span className="text-2xl shrink-0 mt-0.5" role="img" aria-label={o.title}>{o.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-gray-900 leading-snug">
                    <span className="text-[#2563eb]">{o.count}</span> {o.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{o.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Children callout (red) ── */}
          <div className="bg-[#dc2626] text-white rounded-lg px-5 sm:px-6 py-5 text-center text-sm sm:text-base leading-relaxed shadow-sm">
            <p>
              <strong className="text-lg sm:text-xl">50,000 U.S. citizen children</strong> depend on their Haitian TPS parents&rsquo; contributions to the U.S. workforce.
            </p>
            <p className="mt-1">
              Without their parent&rsquo;s income, <strong className="text-amber-300 text-base sm:text-lg">25,000 U.S. citizen children would be pushed into poverty.</strong>
            </p>
          </div>

          {/* ── Closing statement ── */}
          <div className="text-center py-3">
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-snug">
              We must ensure TPS for Haiti continues.
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-snug">
              Our economy and families rely on it.
            </p>
          </div>

          {/* ── Divider ── */}
          <hr className="border-gray-200" />

          {/* ── State breakdowns ── */}
          <h3 className="text-lg font-extrabold text-gray-900">State-by-state breakdown</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {stateBreakdowns.map(s => (
              <div key={s.state} className="rounded-lg overflow-hidden border border-blue-200">
                <div className="bg-[#2563eb] text-white px-4 py-2.5 font-bold text-sm">
                  Haitian TPS holders make <span className="underline decoration-amber-300 decoration-2 underline-offset-2">{s.state}</span> stronger
                </div>
                <div className="px-4 py-3.5 space-y-2 text-sm bg-white">
                  <p className="text-gray-700">
                    <strong className="text-[#2563eb] text-base">{s.workforce}</strong> Haitian TPS workforce, including {s.jobs}
                  </p>
                  <div className="grid grid-cols-1 gap-1 pt-1 border-t border-gray-100">
                    <p className="text-gray-700"><strong>{s.economic}</strong> in annual economic contributions</p>
                    <p className="text-gray-700"><strong>{s.federal}</strong> in annual federal and payroll taxes</p>
                    <p className="text-gray-700"><strong>{s.stateLocal}</strong> in annual state and local taxes</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Data notes ── */}
          <details className="text-xs text-gray-500 bg-gray-50 rounded-lg p-4 border border-gray-100">
            <summary className="cursor-pointer font-semibold text-gray-600 hover:text-gray-800">Data, Methods, Notes</summary>
            <p className="mt-3 leading-relaxed">
              Population and worker estimates are based on augmented 2024 American Community Survey (ACS). Number of TPS holders is as of early 2025 before initial efforts by the Trump administration to terminate the TPS designation for Haiti. All estimates were prepared by Dr. Phillip Connor, research fellow at Princeton University. See phillip-connor.com for more information on the ACS methodology. Economic contribution is the total annual income after the payment of taxes. Federal and payroll taxes are based on tax rates from the Congressional Budget Office. State and local taxes are derived from the Institute on Taxation and Economic Policy&rsquo;s state tax rates and include all forms of state and local taxation. States and metros are top locations of residence for Haitian TPS holders as derived from the ACS analysis. Occupational categories were collapsed to provide meaningful groups, rounded to thousands. Descriptions of worker services and produced goods are based on researched multipliers and are conservative estimates.
            </p>
          </details>

          {/* ── Download link ── */}
          <div className="text-center pt-2">
            <a
              href="/Haiti-TPS-Fact-Sheet.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-action to-action-end hover:from-action-dark hover:to-action-end-dark text-white font-semibold py-2.5 px-5 rounded-lg text-sm transition-all shadow-sm hover:shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download PDF Fact Sheet
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
