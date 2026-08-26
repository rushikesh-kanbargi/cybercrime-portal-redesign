// Original wordmark icon — NOT the Ashoka Emblem, NOT the Government of
// India tricolor cockade, no resemblance to any real seal. A shield-and-check
// silhouette with a diamond notch at the top point as the one original
// detail, so it reads as a considered mark rather than a re-skin of lucide's
// ShieldCheck, which the header/footer used before this pass.
export function SiteMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.4 L19.5 5.2 V11.3 C19.5 16.1 16.4 19.6 12 21.2 C7.6 19.6 4.5 16.1 4.5 11.3 V5.2 Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M12 2.4 L19.5 5.2 V11.3 C19.5 16.1 16.4 19.6 12 21.2 C7.6 19.6 4.5 16.1 4.5 11.3 V5.2 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M12 1.6 L12.9 2.9 L12 4.2 L11.1 2.9 Z" fill="currentColor" />
      <path
        d="M8.5 11.6 L10.8 13.9 L15.5 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
