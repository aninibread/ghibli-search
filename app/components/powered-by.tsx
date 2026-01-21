export function PoweredBy() {
  return (
    <a
      href="https://developers.cloudflare.com/ai-search/"
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed top-3 right-3 sm:bottom-3 sm:top-auto sm:right-3 z-50 flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 bg-white/60 backdrop-blur-sm rounded-full border border-slate-200/60 text-slate-400 hover:text-slate-500 hover:bg-white/70 hover:shadow-[0_0_8px_rgba(148,163,184,0.3)] transition-all duration-300 text-[10px] sm:text-xs overflow-hidden"
    >
      {/* Subtle shimmer effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <span className="relative hidden sm:inline">Powered by</span>
      <img
        src="https://www.cloudflare.com/favicon.ico"
        alt="Cloudflare"
        className="relative h-4 w-4 sm:h-3 sm:w-3 group-hover:scale-105 transition-transform duration-300"
      />
      <span className="relative group-hover:text-slate-600 transition-colors duration-300 hidden sm:inline">Cloudflare AI Search</span>
    </a>
  );
}
