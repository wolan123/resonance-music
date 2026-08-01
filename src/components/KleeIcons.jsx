export function SparkleIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 1.2c.85 5.9 4.9 9.95 10.8 10.8-5.9.85-9.95 4.9-10.8 10.8C11.15 16.9 7.1 12.85 1.2 12 7.1 11.15 11.15 7.1 12 1.2z" />
    </svg>
  )
}

export function BombIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bombBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f56f74" />
          <stop offset="1" stopColor="#b22e33" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="30" r="16" fill="url(#bombBody)" />
      <circle cx="18.5" cy="24.5" r="4.5" fill="#fff" opacity="0.28" />
      <path d="M34 18c6.4 1.1 8.8 5.2 9.3 11" stroke="#8a5a5a" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path
        d="M43.5 8.5c.55 3.4 2.3 5.1 5.8 5.65-3.5.55-5.25 2.25-5.8 5.65-.55-3.4-2.3-5.1-5.8-5.65 3.5-.55 5.25-2.25 5.8-5.65z"
        fill="#ffc53d"
      />
      <circle cx="19" cy="30" r="2.8" fill="#fff" />
      <circle cx="29" cy="30" r="2.8" fill="#fff" />
      <circle cx="19.7" cy="30.9" r="1.25" fill="#3f2626" />
      <circle cx="29.7" cy="30.9" r="1.25" fill="#3f2626" />
      <path d="M20 37.2q4 3.5 8 0" stroke="#3f2626" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}
