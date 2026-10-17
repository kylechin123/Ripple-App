// Bright, flat SVG illustrations for each issue category, in the same palette as the AI hero art.

type Props = { category: string; className?: string };

const SKY: Record<string, [string, string]> = {
  environment: ["#a78bfa", "#fdba74"],
  food: ["#f472b6", "#fde68a"],
  newcomers: ["#818cf8", "#f9a8d4"],
  accessibility: ["#c084fc", "#fdba74"],
};

function Sparkles() {
  return (
    <g fill="#ffffff" opacity="0.9">
      <path d="M40 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
      <path d="M262 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      <circle cx="215" cy="18" r="2.5" />
      <circle cx="90" cy="40" r="2" />
    </g>
  );
}

function Environment() {
  return (
    <>
      <path d="M0 92 Q70 70 150 88 T300 80 V140 H0z" fill="#86efac" />
      <path d="M0 108 Q90 92 170 106 T300 100 V140 H0z" fill="#4ade80" />
      <ellipse cx="150" cy="118" rx="70" ry="14" fill="#60a5fa" />
      <g fill="none" stroke="#dbeafe" strokeWidth="2.5" opacity="0.9">
        <ellipse cx="150" cy="118" rx="44" ry="8" />
        <ellipse cx="150" cy="118" rx="22" ry="4" />
      </g>
      <rect x="46" y="66" width="6" height="34" rx="3" fill="#92400e" />
      <circle cx="49" cy="58" r="20" fill="#22c55e" />
      <circle cx="38" cy="66" r="12" fill="#16a34a" />
      <rect x="244" y="60" width="6" height="38" rx="3" fill="#92400e" />
      <path d="M247 30 L270 76 H224z" fill="#15803d" />
      <g transform="translate(92 76)">
        <rect x="0" y="10" width="16" height="22" rx="6" fill="#ffffff" stroke="#e2e8f0" />
        <path d="M3 10 Q8 2 13 10" fill="none" stroke="#cbd5e1" strokeWidth="2" />
      </g>
    </>
  );
}

function Food() {
  return (
    <>
      <path d="M0 104 Q150 88 300 104 V140 H0z" fill="#fde68a" />
      <g transform="translate(96 46)">
        <rect x="0" y="22" width="108" height="62" rx="10" fill="#f59e0b" />
        <path d="M0 22 L18 6 H90 L108 22z" fill="#fbbf24" />
        <rect x="38" y="44" width="32" height="14" rx="4" fill="#fff7ed" />
        <circle cx="22" cy="14" r="12" fill="#ef4444" />
        <path d="M22 2 q4 -6 8 -2" stroke="#16a34a" strokeWidth="3" fill="none" />
        <rect x="44" y="-8" width="14" height="26" rx="4" fill="#fb7185" />
        <circle cx="84" cy="12" r="12" fill="#22c55e" />
        <circle cx="74" cy="6" r="8" fill="#4ade80" />
      </g>
      <path d="M232 56 q14 -20 28 0 q-14 22 -28 0z" fill="#f43f5e" opacity="0.9" />
      <path d="M44 70 q10 -14 20 0 q-10 16 -20 0z" fill="#f43f5e" opacity="0.7" />
    </>
  );
}

function Newcomers() {
  return (
    <>
      <path d="M0 104 Q150 90 300 104 V140 H0z" fill="#c7d2fe" />
      <rect x="36" y="30" width="96" height="44" rx="20" fill="#ffffff" />
      <path d="M60 74 l-6 14 18 -14z" fill="#ffffff" />
      <text x="84" y="59" textAnchor="middle" fontSize="20" fontFamily="sans-serif" fill="#7c3aed">Hi! 👋</text>
      <rect x="160" y="40" width="104" height="44" rx="20" fill="#fdf2f8" />
      <path d="M240 84 l6 14 -18 -14z" fill="#fdf2f8" />
      <text x="212" y="69" textAnchor="middle" fontSize="18" fontFamily="sans-serif" fill="#db2777">你好 · வணக்கம்</text>
      <circle cx="110" cy="112" r="14" fill="#fbbf24" />
      <circle cx="190" cy="112" r="14" fill="#a78bfa" />
      <path d="M124 116 q26 12 52 0" stroke="#ffffff" strokeWidth="5" fill="none" strokeLinecap="round" />
    </>
  );
}

function Accessibility() {
  return (
    <>
      <path d="M0 110 H300 V140 H0z" fill="#e9d5ff" />
      <rect x="20" y="40" width="90" height="70" rx="6" fill="#ffffff" />
      <rect x="44" y="64" width="40" height="46" rx="4" fill="#c4b5fd" />
      <rect x="20" y="30" width="90" height="14" rx="4" fill="#f97316" />
      <path d="M110 110 L200 82 V110z" fill="#fb923c" />
      <path d="M110 110 L200 82" stroke="#ffffff" strokeWidth="3" strokeDasharray="6 6" />
      <g transform="translate(206 54)" fill="none" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="22" cy="4" r="5" fill="#7c3aed" />
        <path d="M22 12 V34 H40 L48 50" />
        <circle cx="20" cy="40" r="16" />
      </g>
    </>
  );
}

export function IssueArt({ category, className = "" }: Props) {
  const [top, bottom] = SKY[category] ?? SKY.environment;
  const id = `sky-${category}`;
  return (
    <svg viewBox="0 0 300 140" className={className} role="img" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="300" height="140" fill={`url(#${id})`} />
      <Sparkles />
      {category === "food" ? <Food /> : category === "newcomers" ? <Newcomers /> : category === "accessibility" ? <Accessibility /> : <Environment />}
    </svg>
  );
}
