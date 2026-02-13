export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Background decorative orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-60 -right-60 w-[500px] h-[500px] rounded-full bg-sky-500/[0.03] blur-[120px]" />
        <div className="absolute top-1/2 -left-60 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.02] blur-[120px]" />
        <div className="absolute bottom-40 right-1/4 w-[350px] h-[350px] rounded-full bg-indigo-500/[0.02] blur-[120px]" />
      </div>

      {/* Hero */}
      <section className="relative px-4 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="mx-auto max-w-5xl text-center">
          <div className="animate-glass-in mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium tracking-wide text-sky-300/90 backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Powered by Claude, GPT, Gemini &amp; more
          </div>

          <h1 className="animate-glass-in stagger-1 text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-7xl">
            <span className="text-white">Build Winning</span>
            <br />
            <span className="gradient-text">One Piece TCG Decks</span>
          </h1>

          <p className="animate-glass-in stagger-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl">
            AI-powered deck building, synergy detection, and strategic analysis.
            Go from idea to optimized deck in minutes.
          </p>

          <div className="animate-glass-in stagger-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/deck-builder"
              className="glass-btn-primary inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-semibold tracking-wide shadow-lg shadow-sky-500/20 transition-all hover:shadow-sky-500/30"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Start Building
            </a>
            <a
              href="/cards"
              className="glass-btn-secondary inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-medium tracking-wide"
            >
              Browse Cards
              <svg className="h-4 w-4 text-white/55 transition-colors group-hover:text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative px-4 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-5 sm:grid-cols-3">
            <a href="/cards" className="glass-card group p-7 animate-glass-in stagger-2">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20 transition-colors group-hover:bg-sky-500/20">
                <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Card Database</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Browse, search, and filter the complete OPTCG card collection with instant previews.
              </p>
            </a>

            <a href="/deck-builder" className="glass-card group p-7 animate-glass-in stagger-3">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/20 transition-colors group-hover:bg-cyan-500/20">
                <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.58-3.65A1.5 1.5 0 015 10.24V5.5A1.5 1.5 0 016.5 4h11A1.5 1.5 0 0119 5.5v4.74a1.5 1.5 0 01-.84 1.28l-5.58 3.65a1.5 1.5 0 01-1.16 0zM12 15.17V20" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 21h4.5" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Deck Builder</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Drag, drop, and refine your deck with real-time validation against official rules.
              </p>
            </a>

            <a href="/decks" className="glass-card group p-7 animate-glass-in stagger-4">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 transition-colors group-hover:bg-violet-500/20">
                <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Get synergy breakdowns, cost curve optimization, and strategic recommendations.
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative px-4 pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="animate-glass-in text-3xl font-bold text-white sm:text-4xl">How It Works</h2>
            <p className="animate-glass-in stagger-1 mt-3 text-white/55">Three steps to a tournament-ready deck</p>
          </div>

          <div className="mt-14 grid gap-12 sm:grid-cols-3 sm:gap-8">
            {/* Step 1 */}
            <div className="animate-glass-in stagger-2 relative text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <span className="text-xl font-bold gradient-text">1</span>
              </div>
              <h3 className="text-base font-semibold text-white">Choose a Leader</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/55">
                Pick your leader card to define the color identity and strategy of your deck.
              </p>
              {/* Connector line (hidden on mobile) */}
              <div className="hidden sm:block absolute top-7 left-[calc(50%+40px)] w-[calc(100%-80px)] border-t border-dashed border-white/10" />
            </div>

            {/* Step 2 */}
            <div className="animate-glass-in stagger-3 relative text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <span className="text-xl font-bold gradient-text">2</span>
              </div>
              <h3 className="text-base font-semibold text-white">Build Your Deck</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/55">
                Add 50 cards with real-time rule validation, cost curve tracking, and color checks.
              </p>
              <div className="hidden sm:block absolute top-7 left-[calc(50%+40px)] w-[calc(100%-80px)] border-t border-dashed border-white/10" />
            </div>

            {/* Step 3 */}
            <div className="animate-glass-in stagger-4 text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <span className="text-xl font-bold gradient-text">3</span>
              </div>
              <h3 className="text-base font-semibold text-white">Analyze &amp; Optimize</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/55">
                Run AI analysis to uncover synergies, fix weaknesses, and sharpen your strategy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities grid */}
      <section className="relative px-4 pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="glass overflow-hidden p-px">
            <div className="rounded-[calc(1rem-1px)] bg-[#0d1525]/80 p-8 sm:p-10">
              <h2 className="animate-glass-in text-2xl font-bold text-white sm:text-3xl">
                Built for Competitive Play
              </h2>
              <p className="animate-glass-in stagger-1 mt-2 text-sm text-white/55">
                Everything you need to climb the ranks
              </p>

              <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                <div className="animate-glass-in stagger-2 flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-500/20">
                    <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Multi-AI Analysis</h4>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">
                      Choose from Claude, GPT, Gemini, and more. Each provider brings unique strategic insights.
                    </p>
                  </div>
                </div>

                <div className="animate-glass-in stagger-3 flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Rule Validation</h4>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">
                      Automatic enforcement of official OPTCG rules — leader colors, card limits, deck size.
                    </p>
                  </div>
                </div>

                <div className="animate-glass-in stagger-4 flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                    <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Cost Curve Optimization</h4>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">
                      Visualize and balance your DON!! curve for a smooth, competitive mana progression.
                    </p>
                  </div>
                </div>

                <div className="animate-glass-in stagger-5 flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 ring-1 ring-rose-500/20">
                    <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Synergy Detection</h4>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">
                      AI identifies powerful card combos, tribal synergies, and hidden interactions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative px-4 pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="animate-glass-in text-2xl font-bold text-white sm:text-3xl">
            Ready to Build?
          </h2>
          <p className="animate-glass-in stagger-1 mt-3 text-white/55">
            Jump into the deck builder and let AI guide your strategy.
          </p>
          <div className="animate-glass-in stagger-2 mt-8">
            <a
              href="/deck-builder"
              className="glass-btn-primary inline-flex items-center gap-2.5 px-8 py-3.5 text-sm font-semibold tracking-wide shadow-lg shadow-sky-500/20"
            >
              Open Deck Builder
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
