export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg width={compact ? 36 : 44} height={compact ? 36 : 44} viewBox="0 0 48 48" aria-hidden>
        <defs>
          <linearGradient id="pg-gold" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F0D78C" />
            <stop offset="1" stopColor="#C9A227" />
          </linearGradient>
        </defs>
        <path
          d="M24 3.5 41 10.2v13.4c0 11.2-7.4 18.6-17 21.4-9.6-2.8-17-10.2-17-21.4V10.2L24 3.5Z"
          fill="#081A33"
          stroke="url(#pg-gold)"
          strokeWidth="1.6"
        />
        <path
          d="M16.2 24.4 21.6 29.6 32.2 17.8"
          fill="none"
          stroke="url(#pg-gold)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && (
        <div className="leading-tight">
          <div className="font-[family-name:var(--font-display)] text-[15px] tracking-[0.12em] text-[#F3E6C0]">
            PROTOCOLLO GARE
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#8BA3B8]">
            Piattaforma documentale
          </div>
        </div>
      )}
    </div>
  );
}
