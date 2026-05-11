export default function PixoraAtmosphere() {
  return (
    <div className="pixora-atmosphere" aria-hidden="true">
      <svg className="pixora-atmosphere-svg" viewBox="0 0 1440 920" preserveAspectRatio="none">
        <defs>
          <pattern id="pixora-dot-grid" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M42 0H0V42" fill="none" stroke="rgba(122,63,19,0.08)" strokeWidth="1" />
            <circle cx="2" cy="2" r="1.2" fill="rgba(47,92,79,0.16)" />
          </pattern>
          <linearGradient id="pixora-line-warm" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(122,63,19,0)" />
            <stop offset="0.45" stopColor="rgba(122,63,19,0.32)" />
            <stop offset="1" stopColor="rgba(47,92,79,0)" />
          </linearGradient>
          <linearGradient id="pixora-line-green" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(47,92,79,0)" />
            <stop offset="0.5" stopColor="rgba(47,92,79,0.22)" />
            <stop offset="1" stopColor="rgba(122,63,19,0)" />
          </linearGradient>
        </defs>

        <rect width="1440" height="920" fill="url(#pixora-dot-grid)" opacity="0.5" />

        <g className="pixora-drift-slow">
          <path
            d="M-40 218C174 156 260 302 454 240C640 181 693 50 916 102C1086 142 1188 252 1480 174"
            fill="none"
            stroke="url(#pixora-line-warm)"
            strokeWidth="2"
          />
          <path
            d="M-70 650C160 558 312 696 511 602C693 516 796 432 1000 494C1195 554 1241 702 1510 590"
            fill="none"
            stroke="url(#pixora-line-green)"
            strokeWidth="2"
          />
        </g>

        <g className="pixora-drift" opacity="0.7">
          <rect x="1030" y="96" width="210" height="135" rx="18" fill="none" stroke="rgba(122,63,19,0.16)" />
          <rect x="1054" y="120" width="162" height="88" rx="12" fill="none" stroke="rgba(47,92,79,0.16)" />
          <path d="M1095 181L1126 151L1154 174L1176 156L1216 196" fill="none" stroke="rgba(122,63,19,0.18)" strokeWidth="2" />
        </g>

        <g className="pixora-drift-delayed" opacity="0.65">
          <rect x="116" y="610" width="176" height="122" rx="18" fill="none" stroke="rgba(47,92,79,0.14)" />
          <path d="M142 702H266M142 674H236M142 646H252" stroke="rgba(122,63,19,0.16)" strokeWidth="2" strokeLinecap="round" />
          <path d="M266 624L280 638L266 652L252 638Z" fill="rgba(199,138,74,0.2)" stroke="rgba(122,63,19,0.18)" />
        </g>
      </svg>
    </div>
  );
}
