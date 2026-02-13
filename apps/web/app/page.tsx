export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-6xl font-bold gradient-text mb-6 animate-glass-in">
          Welcome to OPTCG AI Agent
        </h1>
        <p className="text-xl text-white/60 mb-8 animate-glass-in stagger-1">
          Build, analyze, and optimize your One Piece Trading Card Game decks
          with AI-powered insights
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <a
            href="/cards"
            className="glass-card p-8 group animate-glass-in stagger-1"
          >
            <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center mb-4 mx-auto transition-colors group-hover:bg-sky-500/30">
              <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Browse Cards</h3>
            <p className="text-white/50">
              Explore the complete One Piece TCG card database
            </p>
          </a>

          <a
            href="/deck-builder"
            className="glass-card p-8 group animate-glass-in stagger-2"
          >
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4 mx-auto transition-colors group-hover:bg-cyan-500/30">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Build Decks</h3>
            <p className="text-white/50">
              Create and optimize competitive decks with our deck builder
            </p>
          </a>

          <a
            href="/decks"
            className="glass-card p-8 group animate-glass-in stagger-3"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 mx-auto transition-colors group-hover:bg-emerald-500/30">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">AI Analysis</h3>
            <p className="text-white/50">
              Get AI-powered insights and recommendations for your decks
            </p>
          </a>
        </div>

        <div className="mt-16 glass p-8 animate-glass-in stagger-4">
          <h2 className="text-2xl font-bold text-white mb-6">Key Features</h2>
          <ul className="space-y-3 text-left max-w-2xl mx-auto">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-white/80">
                <strong className="text-white">AI-Powered Analysis:</strong> Get strategic
                recommendations powered by Claude Sonnet 4.6
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-white/80">
                <strong className="text-white">Deck Validation:</strong> Automatic validation against
                official One Piece TCG rules
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-white/80">
                <strong className="text-white">Synergy Detection:</strong> Identify powerful card
                combinations and tribal synergies
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-white/80">
                <strong className="text-white">Cost Curve Analysis:</strong> Optimize your DON!!
                progression for competitive play
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
